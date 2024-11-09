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
            'shipment_id': f'ORD-{1000 + i}',
            'order_date': (datetime.now() - timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d'),
            'origin': (random.uniform(-90,90), random.uniform(-180,180)),
            'destination': (random.uniform(-90,90), random.uniform(-180,180)),
            'transport_mode': random.choice(['air', 'truck', 'train', 'ship']),
            'packages': [{
                'packaging_id': f'PKG-{100 + i}',
                'material_type': random.choice(packaging),
                'weight': random.uniform(1, 10),
                'dimensions': {'length':random.uniform(1, 10), 'breadth':random.uniform(1, 10), 'height':random.uniform(1,10)}
                }]
        }
        data.append(record)
    
    with open('structured_data.json', 'w') as file:
        json.dump(data, file, indent=4)
    
    return pd.DataFrame(data)

# generate synthetic unstructured text data
def generate_unstructured_data(num_records=100):
    texts = []
    
    for i in range(num_records):
        # Generate similar parameters as in structured data
        shipment_id = f'ORD-{1000 + i}'
        order_date = (datetime.now() - timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d')
        origin = (random.uniform(-90,90), random.uniform(-180,180))
        destination = (random.uniform(-90,90), random.uniform(-180,180))
        transport_mode = random.choice(['air', 'truck', 'train', 'ship'])
        
        # Package details similar to structured data
        package_material = random.choice(packaging)
        package_weight = random.uniform(1, 10)
        package_dimensions = {
            'length': random.uniform(1, 10), 
            'breadth': random.uniform(1, 10), 
            'height': random.uniform(1,10)
        }
        
        text = f'''
Shipment Details:
-----------------
Shipment ID: {shipment_id}
Order Date: {order_date}

Routing Information:
-------------------
Origin Coordinates: {origin}
Destination Coordinates: {destination}
Transport Mode: {transport_mode}

Package Specifications:
----------------------
Packaging Material: {package_material}
Package Weight: {package_weight:.2f} kg
Package Dimensions: 
    Length: {package_dimensions['length']:.2f} m
    Breadth: {package_dimensions['breadth']:.2f} m
    Height: {package_dimensions['height']:.2f} m

Environmental Impact:
--------------------
Energy Type: {random.choice(energy)}
Estimated Carbon Emission: {round(random.uniform(10, 100), 2)} kg CO2
'''
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
