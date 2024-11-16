import json
import time
from flask import Flask, request, jsonify
from typing import Dict, Any
import pandas as pd
import os
from datetime import datetime
from io import StringIO
import traceback
import requests
from config import API_KEY
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
from supabase import create_client, Client
import datetime
from flask_cors import CORS
from supascript import push_sustainability_data



load_dotenv('.env.local')
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

from sustainability_scoring import (
    LogisticsSustainabilityPipeline,
    SustainabilityPredictor,
    analyze_sustainability
)

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["OPTIONS", "POST", "GET"],
        "allow_headers": ["Content-Type"]
    }
})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

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

import csv

@app.route('/api/v1/sustainability/upload', methods=['POST', 'OPTIONS'])
def upload_csv():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # Read CSV file into pandas DataFrame
        csv_content = StringIO(file.stream.read().decode("UTF-8"))
        df = pd.read_csv(csv_content)

        # Validate required columns
        required_columns = [
            "shipment_id", "timestamp",
            "origin_lat", "origin_long",
            "destination_lat", "destination_long",
            "transport_mode", "packages",
            "sustainability_score"
        ]

        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({
                'error': f'Missing required columns: {", ".join(missing_columns)}'
            }), 400

        # Convert DataFrame to required format
        shipments = []
        sustainability_scores = []

        for _, row in df.iterrows():
            try:
                shipment = {
                    "shipment_id": str(row["shipment_id"]),
                    "timestamp": str(row["timestamp"]),
                    "origin": {
                        "lat": float(row["origin_lat"]),
                        "long": float(row["origin_long"])
                    },
                    "destination": {
                        "lat": float(row["destination_lat"]),
                        "long": float(row["destination_long"])
                    },
                    "transport_mode": str(row["transport_mode"]),
                    "packages": json.loads(row["packages"] if isinstance(row["packages"], str) else row["packages"])
                }
                shipments.append(shipment)
                sustainability_scores.append(float(row["sustainability_score"]))
            except (ValueError, json.JSONDecodeError) as e:
                return jsonify({
                    'error': f'Error processing row {row["shipment_id"]}: {str(e)}'
                }), 400

        data = {
            "data": {
                "shipments": shipments,
                "sustainability_scores": sustainability_scores
            }
        }

        # Save the uploaded data
        json_file_path = os.path.join('/home/mayankch283/carboncare-logistics-agent/uploads', 'uploaded_data.json')
        with open(json_file_path, 'w') as json_file:
            json.dump(data, json_file)

        # Train the model
        train_result = train_model()

        if isinstance(train_result, tuple):
            response_data, status_code = train_result
            if status_code != 200:
                return jsonify({
                    'error': 'Training failed',
                    'details': str(response_data)
                }), status_code

            if hasattr(response_data, 'get_json'):
                response_data = response_data.get_json()

            batch_analysis_result = perform_batch_analysis({"data": {"shipments": shipments}})
            if isinstance(batch_analysis_result, tuple):
                return batch_analysis_result  # Error response
            else:
                # Push the produced JSON file to Supabase
                try:
                    push_sustainability_data(json_file_path)
                except Exception as e:
                    app.logger.error(f"Error pushing data to Supabase: {str(e)}")
                    return jsonify({
                        'error': 'Failed to push data to Supabase',
                        'details': str(e)
                    }), 500

                return jsonify({
                    "message": f"Successfully processed {len(shipments)} shipments",
                    "training_results": response_data.get('training_results', {}) if isinstance(response_data, dict) else {},
                    "batch_analysis": batch_analysis_result
                }), 200
        else:
            app.logger.error(f"Invalid train_result type: {type(train_result)}")
            return jsonify({'error': 'Invalid response from training model'}), 500

    except Exception as e:
        app.logger.error(f"Upload error: {str(e)}")
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
            data['timestamp'] = datetime.datetime.now().isoformat()
        
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
            'timestamp': datetime.datetime.now().isoformat(),
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
        json_file_path = os.path.join('/home/mayankch283/carboncare-logistics-agent/uploads', 'uploaded_data.json')
        
        if not os.path.exists(json_file_path):
            app.logger.error(f"File not found: {json_file_path}")
            return jsonify({'error': 'No uploaded data found for training'}), 404
        
        with open(json_file_path, 'r') as json_file:
            historical_data = json.load(json_file)
        
        app.logger.info(f"Loaded data: {json.dumps(historical_data)[:200]}...")
        
        if not historical_data.get('data') or \
           not historical_data['data'].get('shipments') or \
           not historical_data['data'].get('sustainability_scores'):
            app.logger.error("Invalid data structure")
            return jsonify({
                'error': 'Missing required training data',
                'required_fields': ['data.shipments', 'data.sustainability_scores']
            }), 400
        
        shipments = historical_data['data']['shipments']
        sustainability_scores = historical_data['data']['sustainability_scores']

        if len(shipments) == 0:
            app.logger.error("No shipments found")
            return jsonify({'error': 'No historical data found for training'}), 404 
        
        app.logger.info(f"Training model with {len(shipments)} shipments")
        training_results = predictor.train(
            shipments,
            sustainability_scores
        )
        
        return jsonify({
            'message': 'Model trained successfully',
            'training_results': training_results
        }), 200
        
    except Exception as e:
        app.logger.error(f"Training error: {str(e)}")
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

@app.route('/api/v1/sustainability/batch-analyze', methods=['POST'])
def batch_analyze():
    """Analyze multiple shipments in batch"""
    try:
        data = request.get_json()
        result = perform_batch_analysis(data)
        if isinstance(result, tuple):
            return result  # Error response
        else:
            return jsonify(result)
    except Exception as e:
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__
        }), 500
    
def perform_batch_analysis(data):
    """Perform batch analysis on shipments data"""
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

    return {
        'timestamp': datetime.datetime.now().isoformat(),
        'num_shipments_analyzed': len(results),
        'results': results
    }

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)