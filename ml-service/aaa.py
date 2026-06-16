
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path('D:/Stock/ml-service/.env'))
import os, sendgrid
from sendgrid.helpers.mail import Mail

sg = sendgrid.SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
msg = Mail(
    from_email=os.getenv('SMTP_USER'),
    to_emails=os.getenv('SMTP_USER'),
    subject='Test OTP',
    html_content='<p>Test OTP: 123456</p>'
)
response = sg.send(msg)
print('Status:', response.status_code)
print('Body:', response.body)
print('Headers:', response.headers)
