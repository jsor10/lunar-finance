from fastapi import FastAPI, APIRouter, Header, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def now_utc():
    return datetime.now(timezone.utc)


def to_aware(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# ---------- Models ----------
class SessionRequest(BaseModel):
    session_id: str


class ProfileUpdate(BaseModel):
    name: str


class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    accent: Optional[str] = None
    currency: Optional[str] = None


class SalaryUpdate(BaseModel):
    salary: float


class TransactionInput(BaseModel):
    type: str  # 'expense' | 'income'
    amount: float
    description: str
    category: Optional[str] = "Other"


class CategoryInput(BaseModel):
    name: str
    type: str  # 'expense' | 'income'


class GoalInput(BaseModel):
    name: str
    target: float


class TemplateInput(BaseModel):
    type: str  # 'expense' | 'income'
    amount: float
    description: str
    category: Optional[str] = "Other"


class DeleteLockUpdate(BaseModel):
    lock_until: Optional[str] = None  # ISO string or null to clear


def user_public(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "picture": u.get("picture", ""),
        "salary": u.get("salary", 0.0),
        "theme": u.get("theme", "light"),
        "accent": u.get("accent", "navy"),
        "currency": u.get("currency", "EUR"),
        "delete_lock_until": u.get("delete_lock_until"),
        "custom_categories": u.get("custom_categories", []),
        "goal": u.get("goal"),
        "salary_history": u.get("salary_history", []),
    }


# ---------- Auth dependency ----------
async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    if to_aware(session.get("expires_at")) < now_utc():
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Auth routes ----------
@api_router.post("/auth/session")
async def create_session(payload: SessionRequest):
    async with httpx.AsyncClient(timeout=20) as hc:
        resp = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": payload.session_id})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session id")
    data = resp.json()
    email = data["email"]
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": existing.get("name") or data.get("name", ""),
                      "picture": data.get("picture", "")}},
        )
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "salary": 0.0,
            "theme": "light",
            "accent": "navy",
            "currency": "EUR",
            "delete_lock_until": None,
            "created_at": now_utc().isoformat(),
        }
        await db.users.insert_one(dict(user))
        user.pop("_id", None)

    session_token = data.get("session_token") or uuid.uuid4().hex
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": now_utc(),
        "expires_at": now_utc() + timedelta(days=7),
    })
    return {"session_token": session_token, "user": user_public(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ---------- Profile / settings ----------
@api_router.put("/user/profile")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"name": payload.name}})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(u)


@api_router.put("/user/settings")
async def update_settings(payload: SettingsUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(u)


@api_router.put("/user/delete-lock")
async def set_delete_lock(payload: DeleteLockUpdate, user: dict = Depends(get_current_user)):
    await db.users.update_one({"user_id": user["user_id"]},
                              {"$set": {"delete_lock_until": payload.lock_until}})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(u)


@api_router.delete("/user/account")
async def delete_account(user: dict = Depends(get_current_user)):
    uid = user["user_id"]
    await db.transactions.delete_many({"user_id": uid})
    await db.user_sessions.delete_many({"user_id": uid})
    await db.users.delete_one({"user_id": uid})
    return {"ok": True}


# ---------- Categories ----------
@api_router.post("/categories")
async def add_category(payload: CategoryInput, user: dict = Depends(get_current_user)):
    if payload.type not in ("expense", "income"):
        raise HTTPException(status_code=400, detail="Invalid type")
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    if len(name) > 30:
        raise HTTPException(status_code=400, detail="Name too long")
    existing = user.get("custom_categories", [])
    if any(c["name"].lower() == name.lower() and c["type"] == payload.type for c in existing):
        raise HTTPException(status_code=400, detail="Category already exists")
    cat = {"id": str(uuid.uuid4()), "name": name, "type": payload.type}
    await db.users.update_one({"user_id": user["user_id"]}, {"$push": {"custom_categories": cat}})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(u)


@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, user: dict = Depends(get_current_user)):
    await db.users.update_one({"user_id": user["user_id"]},
                              {"$pull": {"custom_categories": {"id": cat_id}}})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(u)


# ---------- Finance ----------
@api_router.put("/finance/salary")
async def update_salary(payload: SalaryUpdate, user: dict = Depends(get_current_user)):
    month_key = now_utc().strftime("%Y-%m")
    hist = [h for h in user.get("salary_history", []) if h["month"] != month_key]
    hist.append({"month": month_key, "salary": payload.salary})
    hist.sort(key=lambda h: h["month"])
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"salary": payload.salary, "salary_history": hist}},
    )
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(u)


# ---------- Savings goal ----------
@api_router.put("/users/goal")
async def set_goal(payload: GoalInput, user: dict = Depends(get_current_user)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    if payload.target <= 0:
        raise HTTPException(status_code=400, detail="Target must be positive")
    existing = user.get("goal") or {}
    goal = {
        "name": name,
        "target": payload.target,
        "created_at": existing.get("created_at", now_utc().isoformat()),
    }
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"goal": goal}})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(u)


@api_router.delete("/users/goal")
async def delete_goal(user: dict = Depends(get_current_user)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"goal": None}})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(u)


# ---------- Templates (quick-add) ----------
@api_router.get("/templates")
async def list_templates(user: dict = Depends(get_current_user)):
    return await db.templates.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", 1).to_list(100)


@api_router.post("/templates")
async def create_template(payload: TemplateInput, user: dict = Depends(get_current_user)):
    if payload.type not in ("expense", "income"):
        raise HTTPException(status_code=400, detail="Invalid type")
    if payload.amount <= 0 or not payload.description.strip():
        raise HTTPException(status_code=400, detail="Amount and description required")
    count = await db.templates.count_documents({"user_id": user["user_id"]})
    if count >= 20:
        raise HTTPException(status_code=400, detail="Template limit reached (20)")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "type": payload.type,
        "amount": abs(payload.amount),
        "description": payload.description.strip(),
        "category": (payload.category or "Other").strip() or "Other",
        "created_at": now_utc().isoformat(),
    }
    await db.templates.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("user_id", None)
    return doc


@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
    result = await db.templates.delete_one({"id": template_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"ok": True}


@api_router.get("/transactions")
async def list_transactions(user: dict = Depends(get_current_user)):
    docs = await db.transactions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/transactions")
async def create_transaction(payload: TransactionInput, user: dict = Depends(get_current_user)):
    if payload.type not in ("expense", "income"):
        raise HTTPException(status_code=400, detail="Invalid type")
    tx = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "type": payload.type,
        "amount": abs(payload.amount),
        "description": payload.description,
        "category": (payload.category or "Other").strip() or "Other",
        "created_at": now_utc().isoformat(),
    }
    await db.transactions.insert_one(dict(tx))
    tx.pop("_id", None)
    return tx


@api_router.put("/transactions/{tx_id}")
async def update_transaction(tx_id: str, payload: TransactionInput, user: dict = Depends(get_current_user)):
    result = await db.transactions.update_one(
        {"id": tx_id, "user_id": user["user_id"]},
        {"$set": {"type": payload.type, "amount": abs(payload.amount), "description": payload.description,
                  "category": (payload.category or "Other").strip() or "Other"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    tx = await db.transactions.find_one({"id": tx_id}, {"_id": 0})
    return tx


@api_router.delete("/transactions")
async def delete_all_transactions(user: dict = Depends(get_current_user)):
    result = await db.transactions.delete_many({"user_id": user["user_id"]})
    return {"ok": True, "deleted": result.deleted_count}


@api_router.delete("/transactions/month/{year}/{month}")
async def delete_month_transactions(year: int, month: int, user: dict = Depends(get_current_user)):
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid month")
    prefix = f"{year:04d}-{month:02d}"
    result = await db.transactions.delete_many({
        "user_id": user["user_id"],
        "created_at": {"$regex": f"^{prefix}"},
    })
    return {"ok": True, "deleted": result.deleted_count}


@api_router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str, user: dict = Depends(get_current_user)):
    result = await db.transactions.delete_one({"id": tx_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.transactions.create_index("user_id")


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
