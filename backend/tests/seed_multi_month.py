"""Seed multi-month test data (Jun/Jul/Aug 2026) + Gym custom category on the seeded user."""
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path("/app/backend/.env"))
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]

UID = "user_testseed001"
TOKEN = "test_session_token_fixed_123456"

# Ensure user + session exist (re-uses the app's seed script for the user+session bit)
import subprocess
subprocess.run(["python", "seed_test_user.py"], cwd="/app/backend", check=True)

# Reset user's custom categories + tx list to a known state
db.users.update_one({"user_id": UID}, {"$set": {"salary": 3500.0,
                                                 "custom_categories": [
                                                     {"id": str(uuid.uuid4()), "name": "Gym", "type": "expense"}
                                                 ]}})
db.transactions.delete_many({"user_id": UID})

txs = [
    # June 2026
    {"type": "expense", "amount": 55.0, "description": "Gym fee", "category": "Gym", "created_at": "2026-06-05T09:00:00+00:00"},
    {"type": "expense", "amount": 40.0, "description": "Old style",  "category": "Other", "created_at": "2026-06-14T09:00:00+00:00"},
    # July 2026
    {"type": "expense", "amount": 30.0, "description": "Groceries", "category": "Food", "created_at": "2026-07-15T09:00:00+00:00"},
    {"type": "income",  "amount": 200.0,"description": "Side gig",  "category": "Freelance","created_at": "2026-07-10T09:00:00+00:00"},
    # Aug 2026
    {"type": "expense", "amount": 20.0, "description": "Bus pass",  "category": "Transport","created_at": "2026-08-03T09:00:00+00:00"},
    {"type": "expense", "amount": 45.0, "description": "Gym",       "category": "Gym", "created_at": "2026-08-05T09:00:00+00:00"},
]
for t in txs:
    t["id"] = str(uuid.uuid4())
    t["user_id"] = UID
    t["amount"] = float(t["amount"])

db.transactions.insert_many(txs)
print(f"Seeded {len(txs)} transactions across Jun/Jul/Aug 2026 + Gym category on {UID}")
