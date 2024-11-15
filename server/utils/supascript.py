import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv('.env.local')
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

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
        # Fetch data from the sustainability_table
        response = supabase.from_("sustainability_analytics").select("*").execute()
        
        if response.data:
            print("Sustainability data retrieved successfully:")
            return response.data
        else:
            print("No data found in sustainability_table.")
            return None
            
    except Exception as e:
        print("Error fetching sustainability data:", str(e))
        return None

import json
import datetime

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

if __name__ == "__main__":
    login_response = login_with_email("soupysoup1000@gmail.com", "123456")
    
    if login_response:        
        push_sustainability_data('/home/mayankch283/carboncare-logistics-agent/server/utils/ship7.json')
        
        # sustainability_data = get_sustainability_data()

        # print(sustainability_data)

        logout()