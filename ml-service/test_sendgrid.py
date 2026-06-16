# test_sendgrid.py
import sendgrid
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv
import os

load_dotenv()

sg = sendgrid.SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))

message = Mail(
    from_email=os.getenv("SMTP_USER"),
    to_emails=os.getenv("SMTP_USER"),
    subject="NeuroTrade — Test Email",
    html_content="""
    <div style="font-family:Arial;padding:20px;background:#f0f4f8;border-radius:12px;">
        <h2 style="color:#1a56db">NeuroTrade AI</h2>
        <p>Your email is working correctly!</p>
        <div style="background:#fff;padding:20px;border-radius:8px;text-align:center;margin:20px 0;">
            <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#057a55">
                123456
            </span>
        </div>
        <p style="color:#6b7280;font-size:12px">This is a test OTP email from NeuroTrade.</p>
    </div>
    """
)

try:
    response = sg.send(message)
    print(f"SUCCESS! Status: {response.status_code}")
    print("Check your Gmail inbox!")
except Exception as e:
    print(f"FAILED: {e}")