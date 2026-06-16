# test_sms.py
from twilio.rest import Client
from dotenv import load_dotenv
import os

load_dotenv()

client = Client(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)

try:
    message = client.messages.create(
        body="NeuroTrade test OTP: 123456. Valid for 5 minutes.",
        from_=os.getenv("TWILIO_PHONE"),
        to="+919309944232"
    )
    print(f"SUCCESS! SID: {message.sid}")
    print("Check your phone for the SMS!")
except Exception as e:
    print(f"FAILED: {e}")