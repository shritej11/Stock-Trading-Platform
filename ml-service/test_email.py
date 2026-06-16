# test_email.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import os

load_dotenv()

try:
    msg = MIMEMultipart()
    msg["Subject"] = "NeuroTrade Test Email"
    msg["From"]    = os.getenv("SMTP_USER")
    msg["To"]      = os.getenv("SMTP_USER")
    msg.attach(MIMEText("<h2>Email is working!</h2>", "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
        server.sendmail(os.getenv("SMTP_USER"), os.getenv("SMTP_USER"), msg.as_string())

    print("SUCCESS — check your Gmail inbox!")

except Exception as e:
    print(f"FAILED — {e}")