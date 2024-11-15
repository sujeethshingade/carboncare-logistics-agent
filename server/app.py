import json
from flask import Flask, request, jsonify
from typing import Dict, Any
import pandas as pd
import os
from datetime import datetime
from config import API_KEY
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
from supabase import create_client, Client
import datetime


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

def login_with_email(email: str, password: str):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        print("Login successful")
        return response
    except Exception as e:
        print("Login failed:", str(e))
        return None
def push_sustainability_data(json_file):
    try:
        # Read the JSON file as a string and parse it into a dictionary
        with open(json_file, 'r') as file:
            json_data_str = file.read()
        json_data = json.loads(json_data_str)

        # Get the authenticated user's ID
        user_response = supabase.auth.get_user()
        if not user_response.user:
            print("User is not authenticated.")
            return
        user_id = user_response.user.id

        dt_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        num_shipments = json_data['num_shipments_analyzed']

        # Insert the data into the sustainability_analytics table
        response = supabase.table("sustainability_analytics").insert({
            "data": json.dumps(json_data),  # Convert the dictionary back to a JSON string
            "user_id": user_id,
            "timestamp": dt_str,
            "num_shipments": num_shipments
        }).execute()

    except Exception as e:
        print("Error pushing sustainability data:", str(e))


import csv

@app.route('/api/v1/sustainability/upload', methods=['POST'])
def upload_csv():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # Read CSV file
        csv_file = file.read().decode('utf-8').splitlines()
        reader = csv.DictReader(csv_file)

        shipments = []
        sustainability_scores = []

        for row in reader:
            shipment = {
                "shipment_id": row["shipment_id"],
                "timestamp": row["timestamp"],
                "origin": {
                    "lat": float(row["origin_lat"]),
                    "long": float(row["origin_long"])
                },
                "destination": {
                    "lat": float(row["destination_lat"]),
                    "long": float(row["destination_long"])
                },
                "transport_mode": row["transport_mode"],
                "packages": json.loads(row["packages"])  # 'packages' should be a JSON string in the CSV
            }
            shipments.append(shipment)
            sustainability_scores.append(float(row["sustainability_score"]))

        data = {
            "data": {
                "shipments": shipments,
                "sustainability_scores": sustainability_scores
            }
        }

        login_response = login_with_email("soupysoup1000@gmail.com", "123456")
    
        if login_response:        
            push_sustainability_data('/home/mayankch283/carboncare-logistics-agent/server/utils/ship7.json')
        


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