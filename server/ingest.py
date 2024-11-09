import pandas as pd
import json
from unstructured import Unstructured

# Function to load structured data (JSON) - simulate with a local file or database connection
def load_structured_data(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return pd.DataFrame(data)

# Function to process unstructured data using Unstructured API
def process_unstructured_data(file_path):
    text = Unstructured.load_file(file_path).to_text()  # Extract text
    structured_data = Unstructured.to_json(text)  # Convert to structured format
    return structured_data

# Example: Load structured and unstructured data
structured_data = load_structured_data('utils/structured_data.json')
unstructured_data = process_unstructured_data('utils/unstructured_data_1.txt')
print(structured_data.head())
print(unstructured_data)