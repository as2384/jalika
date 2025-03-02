import json
import logging
from tuya_connector import TuyaOpenAPI, TUYA_LOGGER
import socket

# Force IPv4
import requests.packages.urllib3.util.connection as urllib3_cn
def allowed_gai_family():
    return socket.AF_INET
urllib3_cn.allowed_gai_family = allowed_gai_family

ACCESS_ID = "t7m9dpex7tecqx9a38pk"
ACCESS_KEY = "54b400fbea0c4568b4430342efb7fdc1"
API_ENDPOINT = "https://openapi.tuyaus.com"  # Region-specific endpoint
DEVICE_ID ="eb119cd481c62af46ek0uj"

# Enable debug log
TUYA_LOGGER.setLevel(logging.DEBUG)

# Init OpenAPI and connect
openapi = TuyaOpenAPI(API_ENDPOINT, ACCESS_ID, ACCESS_KEY)
openapi.connect()

# Call APIs from Tuya
# Get the device information
response = openapi.get("/v1.0/iot-03/devices/{}".format(DEVICE_ID))

# Get the instruction set of the device
response = openapi.get("/v1.0/iot-03/devices/{}/functions".format(DEVICE_ID))

# Get the status of a single device
response = openapi.get("/v1.0/iot-03/devices/{}/status".format(DEVICE_ID))