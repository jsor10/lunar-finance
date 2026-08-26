"""Salary Manager backend API tests."""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://salary-manager-140.preview.emergentagent.com").rstrip("/")
TOKEN = "test_session_token_fixed_123456"
AUTH = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Auth ----------
class TestAuth:
    def test_me_with_token(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user_id"] == "user_testseed001"
        assert d["email"] == "testuser@salarymanager.dev"
        for k in ("name", "salary", "theme", "accent", "currency"):
            assert k in d

    def test_me_missing_token_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401, r.text

    def test_me_invalid_token_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer bad_token_xyz"})
        assert r.status_code == 401

    def test_session_invalid_id_returns_401(self, api):
        r = api.post(f"{BASE_URL}/api/auth/session", json={"session_id": "invalid_bogus_id_zzz"})
        assert r.status_code == 401


# ---------- Profile / settings ----------
class TestProfileAndSettings:
    def test_update_profile_name_persists(self, api):
        new_name = f"TEST_Name_{uuid.uuid4().hex[:6]}"
        r = api.put(f"{BASE_URL}/api/user/profile", json={"name": new_name}, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["name"] == new_name
        # GET to verify
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        assert me["name"] == new_name
        # restore
        api.put(f"{BASE_URL}/api/user/profile", json={"name": "Test User"}, headers=AUTH)

    def test_update_settings_persists(self, api):
        payload = {"theme": "dark", "accent": "gold", "currency": "USD"}
        r = api.put(f"{BASE_URL}/api/user/settings", json=payload, headers=AUTH)
        assert r.status_code == 200
        d = r.json()
        assert d["theme"] == "dark" and d["accent"] == "gold" and d["currency"] == "USD"
        # GET verify
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        assert me["theme"] == "dark" and me["accent"] == "gold" and me["currency"] == "USD"
        # restore defaults
        api.put(f"{BASE_URL}/api/user/settings",
                json={"theme": "light", "accent": "navy", "currency": "EUR"}, headers=AUTH)

    def test_delete_lock_set_and_clear(self, api):
        until = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        r = api.put(f"{BASE_URL}/api/user/delete-lock", json={"lock_until": until}, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["delete_lock_until"] == until
        r2 = api.put(f"{BASE_URL}/api/user/delete-lock", json={"lock_until": None}, headers=AUTH)
        assert r2.status_code == 200
        assert r2.json()["delete_lock_until"] is None


# ---------- Finance / salary ----------
class TestSalary:
    def test_update_salary(self, api):
        r = api.put(f"{BASE_URL}/api/finance/salary", json={"salary": 4500.75}, headers=AUTH)
        assert r.status_code == 200
        assert abs(r.json()["salary"] - 4500.75) < 1e-6
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        assert abs(me["salary"] - 4500.75) < 1e-6


# ---------- Transactions CRUD ----------
class TestTransactions:
    def test_create_get_update_delete(self, api):
        # create expense
        payload = {"type": "expense", "amount": 120.50, "description": "TEST_groceries"}
        r = api.post(f"{BASE_URL}/api/transactions", json=payload, headers=AUTH)
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["type"] == "expense" and tx["amount"] == 120.50
        tx_id = tx["id"]

        # list contains it
        lst = api.get(f"{BASE_URL}/api/transactions", headers=AUTH).json()
        assert any(t["id"] == tx_id for t in lst)

        # update -> income
        upd = {"type": "income", "amount": 50.0, "description": "TEST_bonus"}
        r = api.put(f"{BASE_URL}/api/transactions/{tx_id}", json=upd, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["type"] == "income" and r.json()["amount"] == 50.0

        # verify update via GET
        lst2 = api.get(f"{BASE_URL}/api/transactions", headers=AUTH).json()
        got = [t for t in lst2 if t["id"] == tx_id][0]
        assert got["description"] == "TEST_bonus"

        # delete
        r = api.delete(f"{BASE_URL}/api/transactions/{tx_id}", headers=AUTH)
        assert r.status_code == 200
        # verify absent
        lst3 = api.get(f"{BASE_URL}/api/transactions", headers=AUTH).json()
        assert not any(t["id"] == tx_id for t in lst3)

        # delete again -> 404
        r = api.delete(f"{BASE_URL}/api/transactions/{tx_id}", headers=AUTH)
        assert r.status_code == 404

    def test_invalid_type_400(self, api):
        r = api.post(f"{BASE_URL}/api/transactions",
                     json={"type": "bogus", "amount": 10, "description": "x"}, headers=AUTH)
        assert r.status_code == 400

    def test_transactions_unauth_401(self, api):
        r = requests.get(f"{BASE_URL}/api/transactions")
        assert r.status_code == 401


# ---------- Categories (NEW) ----------
class TestCategories:
    """Custom categories add/delete + validation."""

    def _cleanup(self, api, name, type_):
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        for c in me.get("custom_categories", []):
            if c["name"] == name and c["type"] == type_:
                api.delete(f"{BASE_URL}/api/categories/{c['id']}", headers=AUTH)

    def test_add_category_expense_persists_and_returned_in_me(self, api):
        name = f"TEST_CatExp_{uuid.uuid4().hex[:6]}"
        self._cleanup(api, name, "expense")
        r = api.post(f"{BASE_URL}/api/categories", json={"name": name, "type": "expense"}, headers=AUTH)
        assert r.status_code == 200, r.text
        u = r.json()
        assert any(c["name"] == name and c["type"] == "expense" for c in u["custom_categories"])
        # GET /auth/me confirms persistence
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        assert any(c["name"] == name for c in me["custom_categories"])
        self._cleanup(api, name, "expense")

    def test_add_category_income(self, api):
        name = f"TEST_CatInc_{uuid.uuid4().hex[:6]}"
        self._cleanup(api, name, "income")
        r = api.post(f"{BASE_URL}/api/categories", json={"name": name, "type": "income"}, headers=AUTH)
        assert r.status_code == 200
        assert any(c["name"] == name and c["type"] == "income" for c in r.json()["custom_categories"])
        self._cleanup(api, name, "income")

    def test_add_category_duplicate_case_insensitive_returns_400(self, api):
        name = f"TEST_Dup_{uuid.uuid4().hex[:6]}"
        self._cleanup(api, name, "expense")
        r1 = api.post(f"{BASE_URL}/api/categories", json={"name": name, "type": "expense"}, headers=AUTH)
        assert r1.status_code == 200
        r2 = api.post(f"{BASE_URL}/api/categories", json={"name": name.upper(), "type": "expense"}, headers=AUTH)
        assert r2.status_code == 400, r2.text
        # But same name different type is allowed
        r3 = api.post(f"{BASE_URL}/api/categories", json={"name": name, "type": "income"}, headers=AUTH)
        assert r3.status_code == 200
        self._cleanup(api, name, "expense")
        self._cleanup(api, name, "income")

    def test_add_category_invalid_type_returns_400(self, api):
        r = api.post(f"{BASE_URL}/api/categories",
                     json={"name": "TEST_bogus", "type": "bogus"}, headers=AUTH)
        assert r.status_code == 400

    def test_add_category_empty_name_returns_400(self, api):
        r = api.post(f"{BASE_URL}/api/categories",
                     json={"name": "   ", "type": "expense"}, headers=AUTH)
        assert r.status_code == 400

    def test_delete_category_removes_it(self, api):
        name = f"TEST_Del_{uuid.uuid4().hex[:6]}"
        r = api.post(f"{BASE_URL}/api/categories", json={"name": name, "type": "expense"}, headers=AUTH)
        assert r.status_code == 200
        cat = next(c for c in r.json()["custom_categories"] if c["name"] == name)
        d = api.delete(f"{BASE_URL}/api/categories/{cat['id']}", headers=AUTH)
        assert d.status_code == 200
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        assert not any(c["id"] == cat["id"] for c in me["custom_categories"])

    def test_categories_require_auth(self, api):
        r = requests.post(f"{BASE_URL}/api/categories",
                          json={"name": "x", "type": "expense"})
        assert r.status_code == 401


# ---------- Transactions with category (NEW) ----------
class TestTransactionsCategory:
    def test_create_with_category_persists(self, api):
        payload = {"type": "expense", "amount": 12.5,
                   "description": "TEST_food_tx", "category": "Food"}
        r = api.post(f"{BASE_URL}/api/transactions", json=payload, headers=AUTH)
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["category"] == "Food"
        # Verify via list
        lst = api.get(f"{BASE_URL}/api/transactions", headers=AUTH).json()
        got = next(t for t in lst if t["id"] == tx["id"])
        assert got["category"] == "Food"
        api.delete(f"{BASE_URL}/api/transactions/{tx['id']}", headers=AUTH)

    def test_create_without_category_defaults_to_Other(self, api):
        payload = {"type": "expense", "amount": 5.0, "description": "TEST_nocat"}
        r = api.post(f"{BASE_URL}/api/transactions", json=payload, headers=AUTH)
        assert r.status_code == 200
        tx = r.json()
        assert tx["category"] == "Other"
        api.delete(f"{BASE_URL}/api/transactions/{tx['id']}", headers=AUTH)

    def test_update_transaction_category(self, api):
        r = api.post(f"{BASE_URL}/api/transactions",
                     json={"type": "expense", "amount": 20, "description": "TEST_upd_cat",
                           "category": "Food"}, headers=AUTH)
        tx = r.json()
        r2 = api.put(f"{BASE_URL}/api/transactions/{tx['id']}",
                     json={"type": "expense", "amount": 20, "description": "TEST_upd_cat",
                           "category": "Transport"}, headers=AUTH)
        assert r2.status_code == 200
        assert r2.json()["category"] == "Transport"
        # verify via GET
        lst = api.get(f"{BASE_URL}/api/transactions", headers=AUTH).json()
        got = next(t for t in lst if t["id"] == tx["id"])
        assert got["category"] == "Transport"
        api.delete(f"{BASE_URL}/api/transactions/{tx['id']}", headers=AUTH)

    def test_transaction_with_custom_category(self, api):
        # user has 'Gym' seeded custom category; use it
        r = api.post(f"{BASE_URL}/api/transactions",
                     json={"type": "expense", "amount": 40, "description": "TEST_gym",
                           "category": "Gym"}, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["category"] == "Gym"
        api.delete(f"{BASE_URL}/api/transactions/{r.json()['id']}", headers=AUTH)


# ---------- Delete-month + delete-all (NEW) ----------
def _mongo_db():
    import os as _os
    from dotenv import load_dotenv as _load
    from pathlib import Path as _P
    from pymongo import MongoClient as _MC
    _load(_P("/app/backend/.env"))
    c = _MC(_os.environ["MONGO_URL"])
    return c[_os.environ["DB_NAME"]]


class TestDeleteMonth:
    """DELETE /api/transactions/month/{year}/{month}"""

    UID = "user_testseed001"
    # Use created_at prefixes far from "current month" so we don't collide with anything else
    PFX_KEEP = "2020-05"
    PFX_DEL = "2020-04"

    def _seed(self):
        db = _mongo_db()
        db.transactions.delete_many({"user_id": self.UID,
                                      "created_at": {"$regex": f"^(2020-04|2020-05)"}})
        docs = [
            {"id": f"TEST_dm_del_a_{uuid.uuid4().hex[:6]}", "user_id": self.UID, "type": "expense",
             "amount": 11.0, "description": "TEST_dm_del_a", "category": "Other",
             "created_at": f"{self.PFX_DEL}-10T12:00:00+00:00"},
            {"id": f"TEST_dm_del_b_{uuid.uuid4().hex[:6]}", "user_id": self.UID, "type": "income",
             "amount": 22.0, "description": "TEST_dm_del_b", "category": "Other",
             "created_at": f"{self.PFX_DEL}-25T09:00:00+00:00"},
            {"id": f"TEST_dm_keep_{uuid.uuid4().hex[:6]}", "user_id": self.UID, "type": "expense",
             "amount": 33.0, "description": "TEST_dm_keep", "category": "Other",
             "created_at": f"{self.PFX_KEEP}-15T12:00:00+00:00"},
        ]
        db.transactions.insert_many(docs)
        return docs

    def _cleanup(self):
        db = _mongo_db()
        db.transactions.delete_many({"user_id": self.UID,
                                      "created_at": {"$regex": f"^(2020-04|2020-05)"}})

    def test_delete_month_deletes_only_that_month(self, api):
        seeded = self._seed()
        try:
            r = api.delete(f"{BASE_URL}/api/transactions/month/2020/4", headers=AUTH)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body.get("ok") is True
            assert body.get("deleted") == 2
            # verify via GET
            lst = api.get(f"{BASE_URL}/api/transactions", headers=AUTH).json()
            ids = {t["id"] for t in lst}
            for d in seeded[:2]:
                assert d["id"] not in ids, "April tx should be deleted"
            # keep one intact
            assert seeded[2]["id"] in ids, "May tx must remain"
        finally:
            self._cleanup()

    def test_delete_month_invalid_month_low_returns_400(self, api):
        r = api.delete(f"{BASE_URL}/api/transactions/month/2026/0", headers=AUTH)
        assert r.status_code == 400, r.text

    def test_delete_month_invalid_month_high_returns_400(self, api):
        r = api.delete(f"{BASE_URL}/api/transactions/month/2026/13", headers=AUTH)
        assert r.status_code == 400, r.text

    def test_delete_month_requires_auth_401(self, api):
        r = requests.delete(f"{BASE_URL}/api/transactions/month/2026/8")
        assert r.status_code == 401

    def test_delete_month_empty_returns_zero(self, api):
        # A guaranteed empty month
        r = api.delete(f"{BASE_URL}/api/transactions/month/1999/1", headers=AUTH)
        assert r.status_code == 200
        assert r.json().get("deleted") == 0


class TestDeleteAllTransactions:
    """DELETE /api/transactions"""

    UID = "user_testseed001"

    def _snapshot_and_restore(self, api, before):
        """Reinsert the original transactions after the destructive test."""
        db = _mongo_db()
        # Best-effort restore: re-insert prior docs (they still have original ids/created_at)
        if before:
            for d in before:
                d.pop("_id", None)
                d["user_id"] = self.UID
            db.transactions.insert_many(before)

    def test_delete_all_requires_auth_401(self, api):
        r = requests.delete(f"{BASE_URL}/api/transactions")
        assert r.status_code == 401

    def test_delete_all_deletes_transactions_and_keeps_user_settings(self, api):
        # snapshot user + txs before
        me_before = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        salary_before = me_before["salary"]
        cats_before = me_before.get("custom_categories", [])
        txs_before = api.get(f"{BASE_URL}/api/transactions", headers=AUTH).json()
        # add a fresh test tx so we know count >=1
        add = api.post(f"{BASE_URL}/api/transactions", headers=AUTH,
                       json={"type": "expense", "amount": 7.7,
                             "description": "TEST_del_all_marker", "category": "Other"}).json()
        try:
            r = api.delete(f"{BASE_URL}/api/transactions", headers=AUTH)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body.get("ok") is True
            assert isinstance(body.get("deleted"), int)
            assert body["deleted"] >= 1
            # GET should now return empty
            lst = api.get(f"{BASE_URL}/api/transactions", headers=AUTH).json()
            assert lst == []
            # user, salary and custom_categories preserved
            me_after = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
            assert me_after["user_id"] == me_before["user_id"]
            assert me_after["salary"] == salary_before
            assert me_after.get("custom_categories", []) == cats_before
        finally:
            # Best-effort: restore the seeded transactions so downstream tests / UI have data
            self._snapshot_and_restore(api, txs_before)


# ---------- Delete account (LAST) ----------
class TestZDeleteAccount:
    def test_delete_account_then_reseed(self, api):
        r = api.delete(f"{BASE_URL}/api/user/account", headers=AUTH)
        assert r.status_code == 200
        # token should be invalid now
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH)
        assert me.status_code == 401
        # re-seed
        import subprocess
        res = subprocess.run(["python", "seed_test_user.py"], cwd="/app/backend", capture_output=True, text=True)
        assert res.returncode == 0, res.stderr
        # verify re-seed works
        me2 = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH)
        assert me2.status_code == 200
