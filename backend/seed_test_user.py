import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

TEST_USER_ID = "user_testseed001"
TEST_EMAIL = "testuser@salarymanager.dev"
TEST_TOKEN = "test_session_token_fixed_123456"


async def main():
    await db.users.update_one(
        {"user_id": TEST_USER_ID},
        {"$set": {
            "user_id": TEST_USER_ID,
            "email": TEST_EMAIL,
            "name": "Test User",
            "picture": "",
            "salary": 3500.0,
            "theme": "light",
            "accent": "navy",
            "currency": "EUR",
            "delete_lock_until": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    await db.user_sessions.update_one(
        {"session_token": TEST_TOKEN},
        {"$set": {
            "session_token": TEST_TOKEN,
            "user_id": TEST_USER_ID,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
        }},
        upsert=True,
    )
    print("Seeded test user + session")
    client.close()


asyncio.run(main())
