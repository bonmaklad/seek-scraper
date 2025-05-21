import os
import pandas as pd
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv

# 1) Load environment (SENDGRID_API_KEY must be in .env or env)
load_dotenv()
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
if not SENDGRID_API_KEY:
    raise RuntimeError("SENDGRID_API_KEY not set in environment")

# 2) Configuration
EXCEL_FILE      = "contractors.xlsx"
TEMPLATE_ID     = "d-49b3c5edeaf345d2b88b956abf2cef54"
FROM_EMAIL      = "Nelly@necta.nz"

# 3) Read contractors.xlsx
df = pd.read_excel(EXCEL_FILE, engine="openpyxl")

# 4) Function to send one email
def send_one(to_email: str, first_name: str):
    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email
    )
    message.template_id = TEMPLATE_ID
    message.dynamic_template_data = {
        "FirstName": first_name
    }
    sg = SendGridAPIClient(SENDGRID_API_KEY)
    return sg.send(message)

# 5) Iterate and send
for idx, row in df.iterrows():
    email = row.get("email", "").strip()
    # normalize first_name: blank if missing, otherwise capitalize first letter
    raw = row.get("first_name")
    if pd.isna(raw) or not str(raw).strip():
        fname = ""
    else:
        fname = str(raw).strip().capitalize()

    if not email:
        print(f"Row {idx}: no email, skipping")
        continue

    try:
        resp = send_one(email, fname)
        print(f"→ Sent to {email!r}: {resp.status_code}")
    except Exception as err:
        print(f"‼ Error sending to {email!r}: {err}")
