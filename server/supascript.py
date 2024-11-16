# supascript.py

import os
from dotenv import load_dotenv
from supabase import create_client, Client
import json
import datetime

load_dotenv('.env.local')

# Load credentials
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
anon_key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase client with Service Role Key for server-side operations
supabase: Client = create_client(url, service_role_key)

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

def get_current_user():
    try:
        user = supabase.auth.get_user()
        print("Current user:", user)
        return user
    except Exception as e:
        print("Error fetching user:", str(e))
        return None

def logout():
    try:
        supabase.auth.sign_out()
        print("Logged out successfully")
    except Exception as e:
        print("Logout failed:", str(e))

def get_sustainability_data():
    try:
        # Fetch data from the sustainability_analytics table
        response = supabase.from_("sustainability_analytics").select("*").execute()
        
        if response.data:
            print("Sustainability data retrieved successfully:")
            return response.data
        else:
            print("No data found in sustainability_analytics table.")
            return None
            
    except Exception as e:
        print("Error fetching sustainability data:", str(e))
        return None

def push_sustainability_data(json_file):
    try:
        # Read the JSON file as a string and parse it into a dictionary
        with open(json_file, 'r') as file:
            json_data = json.load(file)

        dt_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        num_shipments = json_data.get('num_shipments_analyzed', 0)

        # Insert the data into the sustainability_analytics table
        response = supabase.table("sustainability_analytics").insert({
            "data": json.dumps(json_data),
            "timestamp": dt_str,
            "num_shipments": num_shipments
        }).execute()

        if response.status_code == 201:
            print("Data pushed to Supabase successfully.")
        else:
            print(f"Failed to push data. Status code: {response.status_code}, Error: {response.error}")

    except Exception as e:
        print("Error pushing sustainability data:", str(e))

if __name__ == "__main__":
    # Example usage
    push_sustainability_data('/path/to/your/json_file.json')