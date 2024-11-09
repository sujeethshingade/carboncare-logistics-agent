import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
import random

packaging = ['paper', 'plastic', 'biodegradable material', 'recyclable plastic']
energy = ['renewable', 'non-renewable']

# generate synthetic structured data
def generate_structured_data(num_records=100):
    data = []
    for i in range(num_records):
        record = {
            "order_id": f"ORD-{1000 + i}",
            "order_date": (datetime.now() - timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d'),
            "packaging_material": random.choice(packaging),
            "shipping_distance": random.randint(50, 2000),  # Distance in kilometers
            "energy_source": random.choice(energy),
            "warehouse_energy_usage_kWh": round(random.uniform(100, 5000), 2),
            "carbon_emission_kg": round(random.uniform(10, 100), 2),
            "sustainability_score": round(random.uniform(60, 100), 2)  # Example score for simplicity
        }
        data.append(record)
    
    with open('structured_data.json', 'w') as file:
        json.dump(data, file, indent=4)
    
    return pd.DataFrame(data)

# generate synthetic unstructured text data
def generate_unstructured_data(num_records=10):
    texts = []
    
    for i in range(num_records):
        text = f"""
        Invoice ID: INV-{1000 + i}
        Order Date: {(datetime.now() - timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d')}
        
        Packaging Material: {random.choice(packaging)} has been used for this order, aiming to reduce environmental impact.
        Shipping Distance: {random.randint(50, 2000)} kilometers.
        
        The warehouse utilized {random.choice(energy)} for its operations, with a total energy consumption of {round(random.uniform(100, 5000), 2)} kWh.
        Estimated Carbon Emission: {round(random.uniform(10, 100), 2)} kg CO2.
        """
        texts.append(text)
    
    # Save each text as a separate .txt file
    for idx, text in enumerate(texts):
        with open(f'unstructured_data_{idx}.txt', 'w') as file:
            file.write(text)
    
    return texts

# Generate and preview unstructured data
unstructured_data = generate_unstructured_data()
print(unstructured_data[0])


# Generate and preview structured data
structured_df = generate_structured_data()
print(structured_df.head())
