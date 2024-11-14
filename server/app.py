import json
from flask import Flask, request, jsonify
from typing import Dict, Any
import pandas as pd
import os
from datetime import datetime
from config import API_KEY
from huggingface_hub import InferenceClient

from sustainability_scoring import (
    LogisticsSustainabilityPipeline,
    SustainabilityPredictor,
    analyze_sustainability
)

app = Flask(__name__)

# Initialize components
pipeline = LogisticsSustainabilityPipeline()
predictor = SustainabilityPredictor()

client = InferenceClient(api_key=API_KEY)

def get_llm_analysis(metrics: Dict[str, float], overall_score: float) -> str:
    """Get LLM analysis of sustainability metrics"""
    
    prompt = f"""Analyze the following logistics sustainability metrics and provide specific recommendations for improvement:

Metrics:
- Package Sustainability Index: {metrics['package_sustainability_index']:.2f}
- Route Efficiency Score: {metrics['route_efficiency_score']:.2f}
- Carbon Emission Index: {metrics['carbon_emission_index']:.2f}
- Resource Utilization Rate: {metrics['resource_utilization_rate']:.2f}
- Energy Efficiency Rating: {metrics['energy_efficiency_rating']:.2f}
- Waste Reduction Score: {metrics['waste_reduction_score']:.2f}

Overall Sustainability Score: {overall_score:.2f}

Please provide:
1. A brief analysis of the strongest and weakest areas
2. Three specific, actionable recommendations for improvement
3. Potential environmental impact of these improvements
"""

    response = client.chat.completions.create(
        model="meta-llama/Llama-3.2-1B-Instruct",
        messages=[
            { "role": "user", "content": f"{prompt}" }
        ],
        temperature=0.7,
        max_tokens=1024,
    )
    
    return response.choices[0].message.content

@app.route('/api/v1/sustainability/upload', methods=['POST'])
def upload_file():
    """Upload a CSV file, convert it to JSON, and delete the file."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request'}), 400
        
        file = request.files['file']
        
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'File is not a CSV'}), 400
        
        file_path = os.path.join('/tmp', file.filename)  # Use a temp directory
        file.save(file_path)
        
        df = pd.read_csv(file_path)
        json_data = df.to_json(orient='records')

        json_file_path = os.path.join('/tmp', 'uploaded_data.json')
        with open(json_file_path, 'w') as json_file:
            json.dump(json.loads(json_data), json_file)
        
        os.remove(file_path)
        
        return jsonify({
            'message': 'File uploaded and converted successfully',
            'data': json_data
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

@app.route('/api/v1/sustainability/analyze', methods=['POST'])
def analyze_shipment():
    """Analyze shipment sustainability with LLM-enhanced insights"""
    try:
        data = request.get_json()

        # Add timestamp if not present
        if 'timestamp' not in data:
            data['timestamp'] = datetime.now().isoformat()
        
        # Validate required fields
        required_fields = ['shipment_id', 'origin', 'destination', 'transport_mode', 'packages']
        if not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing required fields',
                'required_fields': required_fields
            }), 400
            
        # Perform sustainability analysis
        analysis_results = analyze_sustainability(pipeline, data, predictor)
        
        # Get LLM analysis
        llm_insights = get_llm_analysis(
            analysis_results['metrics'],
            analysis_results['overall_sustainability_score']
        )
        
        # Combine results
        response = {
            'timestamp': datetime.now().isoformat(),
            'shipment_id': data['shipment_id'],
            'sustainability_analysis': analysis_results,
            'llm_insights': llm_insights,
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

@app.route('/api/v1/sustainability/train', methods=['POST'])
def train_model():
    """Train the sustainability predictor with historical data"""
    try:
        json_file_path = os.path.join('/tmp', 'uploaded_data.json')
        
        if not os.path.exists(json_file_path):
            return jsonify({'error': 'No uploaded data found for training'}), 404
        
        with open(json_file_path, 'r') as json_file:
            historical_data = json.load(json_file)
        
        if 'historical_scores' not in request.json:
            return jsonify({
                'error': 'Missing required training scores',
                'required_fields': ['data.shipments', 'data.sustainability_scores']
            }), 400
        
        historical_scores = request.json['data']['sustainability_scores']

        if len(historical_data) == 0:
            return jsonify({'error': 'No historical data found for training'}), 404 
        
        training_results = predictor.train(
            historical_data,
            historical_scores
        )
        
        return jsonify({
            'message': 'Model trained successfully',
            'training_results': training_results
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

@app.route('/api/v1/sustainability/batch-analyze', methods=['POST'])
def batch_analyze():
    """Analyze multiple shipments in batch"""
    try:
        data = request.get_json()
        
        if 'shipments' not in data["data"]:
            return jsonify({
                'error': 'Missing shipments data',
                'required_fields': ['shipments']
            }), 400
            
        results = []
        for shipment in data["data"]['shipments']:
            analysis = analyze_sustainability(pipeline, shipment, predictor)
            llm_insights = get_llm_analysis(
                analysis['metrics'],
                analysis['overall_sustainability_score']
            )
            
            results.append({
                'shipment_id': shipment['shipment_id'],
                'sustainability_analysis': analysis,
                'llm_insights': llm_insights
            })
            
        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'num_shipments_analyzed': len(results),
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)