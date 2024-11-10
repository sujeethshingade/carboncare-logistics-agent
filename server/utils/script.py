import requests
import json

with open('/home/mayankch283/carboncare-logistics-agent/server/synthetic_data.json', 'r') as f:
    data = json.load(f)

# Train the model
response = requests.post('http://localhost:5000/api/v1/sustainability/train', json={
    'historical_data': data['data']['shipments'],
    'historical_scores': data['data']['sustainability_scores']
})