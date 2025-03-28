import datetime
import gspread
import os
import requests
import socket
import time

from tuya_connector import TuyaOpenAPI
from oauth2client.service_account import ServiceAccountCredentials

# Force IPv4
import requests.packages.urllib3.util.connection as urllib3_cn
def allowed_gai_family():
    return socket.AF_INET
urllib3_cn.allowed_gai_family = allowed_gai_family

# Tuya API credentials
ACCESS_ID = "t7m9dpex7tecqx9a38pk"
ACCESS_KEY = "54b400fbea0c4568b4430342efb7fdc1"
API_ENDPOINT = "https://openapi.tuyaus.com"
DEVICE_ID = "eb119cd481c62af46ek0uj"

WEATHER_API_KEY = "974a4e43e5b8c941b81cbf448ab130e2"  # Sign up for free at OpenWeatherMap

# Google Sheets setup
SCOPE = ['https://spreadsheets.google.com/feeds',
         'https://www.googleapis.com/auth/drive']
LAYOUT_SHEET_NAME = 'Layout - GC1'
MEASUREMENT_SHEET_NAME = "Measurements - GC1"  # Your sheet name
SPREADSHEET_NAME = "Hydroponics Datasheet"  # Replace with your actual spreadsheet name
credentials_json = "third_party/tuya/credentials.json"

def get_city_from_sheet():
    """Get the city from the Google Sheet"""
    try:
        # Set up credentials
        creds = ServiceAccountCredentials.from_json_keyfile_name(credentials_json, SCOPE)
        client = gspread.authorize(creds)
        
        # Open spreadsheet and sheet
        spreadsheet = client.open(SPREADSHEET_NAME)
        layout_worksheet = spreadsheet.worksheet(LAYOUT_SHEET_NAME)
        
        # Get city from the specified cell
        city = layout_worksheet.acell('G22').value
        if not city:
            print("City cell is empty, defaulting to San Mateo,US")
            city = "San Mateo,US"
        else:
            # Append country code if not present
            if "," not in city:
                city = f"{city},US"
        
        print(f"Using city: {city}")
        return city
    
    except Exception as e:
        print(f"Error getting city from sheet: {str(e)}")
        print("Defaulting to San Mateo,US")
        return "San Mateo,US"


def get_weather_data(city):
    """Get weather data for the specified city"""
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=imperial"
        response = requests.get(url)
        data = response.json()
        
        if response.status_code == 200:
            temp_f = data['main']['temp']
            weather_condition = data['weather'][0]['main']
            return {
                "temp_f": round(temp_f),
                "condition": weather_condition
            }
        else:
            print(f"Error getting weather: {data.get('message', 'Unknown error')}")
            return None
    except Exception as e:
        print(f"Weather API error: {str(e)}")
        return None

def get_sensor_data():
    """Get data from Tuya water quality sensor"""
    openapi = TuyaOpenAPI(API_ENDPOINT, ACCESS_ID, ACCESS_KEY)
    openapi.connect()
    
    status = openapi.get(f"/v1.0/iot-03/devices/{DEVICE_ID}/status")
    
    if not status.get("success"):
        print(f"Error fetching data: {status}")
        return None
    
    # Extract values
    data = {}
    for item in status.get("result", []):
        data[item["code"]] = item["value"]

    # Apply scaling factors based on the device specifications
    now = datetime.datetime.now()
    
    # Apply scaling factors based on the device specifications
    measurements = {
        "date": now.strftime("%m/%d/%Y"),  # Format: MM/DD/YYYY
        "time": now.strftime("%I:%M %p"),  # Format: HH:MM AM/PM
        "ph": data.get("ph", 0) / 100,  # pH scaling factor
        "tds_ppm": data.get("tds_in", 0),  # Convert to ppm
        "ec_us_cm": data.get("conductivity_value", 0),  # EC in μS/cm
        "temp_c": (data.get("temp_current", 0) / 10) * 9./5 + 32.,  # Temperature in °C
    }
    
    return measurements

def append_to_google_sheets(data, weather_data):
    """Append data to Google Sheets"""
    try:
        # Get credentials from environment variable
        creds = ServiceAccountCredentials.from_json_keyfile_name(credentials_json, SCOPE)
        client = gspread.authorize(creds)
        
        # Open spreadsheet and sheet
        spreadsheet = client.open(SPREADSHEET_NAME)
        worksheet = spreadsheet.worksheet(MEASUREMENT_SHEET_NAME)
        
        # Format data as a row, but convert date and time to proper formats
        row = [
            data["date"],  # Google Sheets will handle this as MM/DD/YYYY
            data["time"],  # Keep time as string
            data["ph"],    # All numeric values won't have apostrophes
            data["tds_ppm"],
            data["ec_us_cm"],
            data["temp_c"],
        ]

        # Add weather data if available
        if weather_data:
            row.append(weather_data["temp_f"])
            row.append(weather_data["condition"])
        else:
            row.append("")
            row.append("")
        
        row.append("")  # Empty column for checkbox
        
        # Instead of using append_row, use insert_row to add values as the appropriate types
        # First get the next available row
        next_row = len(worksheet.get_all_values()) + 1
        
        # Create a range for the cells to update
        cell_range = f"A{next_row}:I{next_row}"
        
        # Update the cells with the proper value types
        worksheet.update(values=[row], range_name=cell_range, value_input_option='USER_ENTERED')

        print(f"Data added successfully: {row}")
        return True
    
    except Exception as e:
        print(f"Error appending to Google Sheets: {str(e)}")
        return False

def main():

    # Get city from the spreadsheet
    city = get_city_from_sheet()

    # Get sensor data
    measurements = get_sensor_data()
    if not measurements:
        print("Failed to get sensor data")
        return

    # Get weather data
    weather_data = get_weather_data(city)
    if weather_data:
        print(f"Weather for {city}: {weather_data['temp_f']}°F, {weather_data['condition']}")
    else:
        print("Failed to get weather data")

    print("Sensor readings:")
    for key, value in measurements.items():
        print(f"  {key}: {value}")
    
    # Write to Google Sheets
    success = append_to_google_sheets(measurements, weather_data)
    if success:
        print("Data successfully written to Google Sheets")
    else:
        print("Failed to write data to Google Sheets")

if __name__ == "__main__":
    main()