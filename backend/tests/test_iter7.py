"""Iteration 7 endpoints — multi savings goals + contribute, hide category, language setting."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://salary-manager-140.preview.emergentagent.com",
).rstrip("/")
TOKEN = "test_session_token_fixed_123456"
AUTH = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Savings goals (new multi-goal API) ----------
class TestGoals:
    def test_list_requires_auth(self, api):
        r = requests.get(f"{BASE_URL}/api/goals")
        assert r.status_code == 401

    def test_create_requires_auth(self, api):
        r = requests.post(f"{BASE_URL}/api/goals", json={"name": "x", "target": 100})
        assert r.status_code == 401

    def test_create_empty_name_400(self, api):
        r = api.post(f"{BASE_URL}/api/goals", json={"name": "   ", "target": 100}, headers=AUTH)
        assert r.status_code == 400

    def test_create_zero_target_400(self, api):
        r = api.post(f"{BASE_URL}/api/goals", json={"name": "x", "target": 0}, headers=AUTH)
        assert r.status_code == 400

    def test_create_negative_target_400(self, api):
        r = api.post(f"{BASE_URL}/api/goals", json={"name": "x", "target": -1}, headers=AUTH)
        assert r.status_code == 400

    def test_create_list_update_delete(self, api):
        name = f"TEST_Goal_{uuid.uuid4().hex[:6]}"
        # create
        c = api.post(f"{BASE_URL}/api/goals", json={"name": name, "target": 750.0}, headers=AUTH)
        assert c.status_code == 200, c.text
        g = c.json()
        assert g["name"] == name and g["target"] == 750.0 and g["saved"] == 0
        assert "id" in g and "created_at" in g
        gid = g["id"]
        # list contains it
        lst = api.get(f"{BASE_URL}/api/goals", headers=AUTH).json()
        assert any(x["id"] == gid for x in lst)
        # update
        u = api.put(f"{BASE_URL}/api/goals/{gid}",
                    json={"name": name + "_upd", "target": 900}, headers=AUTH)
        assert u.status_code == 200
        assert u.json()["name"] == name + "_upd"
        assert u.json()["target"] == 900
        # GET verify persistence
        lst2 = api.get(f"{BASE_URL}/api/goals", headers=AUTH).json()
        got = next(x for x in lst2 if x["id"] == gid)
        assert got["target"] == 900
        # delete
        d = api.delete(f"{BASE_URL}/api/goals/{gid}", headers=AUTH)
        assert d.status_code == 200
        lst3 = api.get(f"{BASE_URL}/api/goals", headers=AUTH).json()
        assert not any(x["id"] == gid for x in lst3)

    def test_update_unknown_404(self, api):
        r = api.put(f"{BASE_URL}/api/goals/nonexistent-id",
                    json={"name": "x", "target": 1}, headers=AUTH)
        assert r.status_code == 404

    def test_delete_unknown_404(self, api):
        r = api.delete(f"{BASE_URL}/api/goals/nonexistent-id", headers=AUTH)
        assert r.status_code == 404


class TestGoalContribute:
    def test_contribute_flow_creates_tx_and_savings_cat(self, api):
        # create a fresh goal
        name = f"TEST_Ctb_{uuid.uuid4().hex[:6]}"
        g = api.post(f"{BASE_URL}/api/goals",
                     json={"name": name, "target": 500}, headers=AUTH).json()
        gid = g["id"]
        try:
            r = api.post(f"{BASE_URL}/api/goals/{gid}/contribute",
                         json={"amount": 42.5}, headers=AUTH)
            assert r.status_code == 200, r.text
            data = r.json()
            assert set(data.keys()) == {"goal", "transaction", "user"}
            # goal saved incremented
            assert data["goal"]["saved"] == 42.5
            # transaction fields
            tx = data["transaction"]
            assert tx["type"] == "expense"
            assert tx["amount"] == 42.5
            assert tx["description"] == name  # description == goal name
            assert tx["category"] == "Savings"
            assert "id" in tx and "created_at" in tx
            assert "user_id" not in tx
            tx_id = tx["id"]
            # user has Savings/expense in custom_categories now
            savings_cats = [c for c in data["user"]["custom_categories"]
                            if c["name"].lower() == "savings" and c["type"] == "expense"]
            assert len(savings_cats) >= 1
            # /transactions returns the contribution
            all_tx = api.get(f"{BASE_URL}/api/transactions", headers=AUTH).json()
            assert any(t["id"] == tx_id for t in all_tx)
            # /auth/me also reflects Savings in custom_categories
            me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
            assert any(c["name"].lower() == "savings" and c["type"] == "expense"
                       for c in me["custom_categories"])
            # cleanup tx (goal deletion below cascades if not; but we clean tx explicitly)
            api.delete(f"{BASE_URL}/api/transactions/{tx_id}", headers=AUTH)
        finally:
            api.delete(f"{BASE_URL}/api/goals/{gid}", headers=AUTH)

    def test_contribute_zero_amount_400(self, api):
        # need an existing goal
        g = api.post(f"{BASE_URL}/api/goals",
                     json={"name": f"TEST_Z_{uuid.uuid4().hex[:6]}", "target": 100},
                     headers=AUTH).json()
        try:
            r = api.post(f"{BASE_URL}/api/goals/{g['id']}/contribute",
                         json={"amount": 0}, headers=AUTH)
            assert r.status_code == 400
        finally:
            api.delete(f"{BASE_URL}/api/goals/{g['id']}", headers=AUTH)

    def test_contribute_negative_amount_400(self, api):
        g = api.post(f"{BASE_URL}/api/goals",
                     json={"name": f"TEST_N_{uuid.uuid4().hex[:6]}", "target": 100},
                     headers=AUTH).json()
        try:
            r = api.post(f"{BASE_URL}/api/goals/{g['id']}/contribute",
                         json={"amount": -10}, headers=AUTH)
            assert r.status_code == 400
        finally:
            api.delete(f"{BASE_URL}/api/goals/{g['id']}", headers=AUTH)

    def test_contribute_unknown_goal_404(self, api):
        r = api.post(f"{BASE_URL}/api/goals/nonexistent-goal-id/contribute",
                     json={"amount": 5}, headers=AUTH)
        assert r.status_code == 404


# ---------- Hide category ----------
class TestHideCategory:
    def _cleanup_hidden(self, api):
        # Direct DB cleanup of hidden_categories
        from pymongo import MongoClient
        from dotenv import load_dotenv
        from pathlib import Path
        load_dotenv(Path("/app/backend/.env"))
        c = MongoClient(os.environ["MONGO_URL"])
        db = c[os.environ["DB_NAME"]]
        db.users.update_one({"user_id": "user_testseed001"},
                             {"$set": {"hidden_categories": []}})

    def test_requires_auth(self, api):
        r = requests.post(f"{BASE_URL}/api/categories/hide",
                          json={"name": "Leisure", "type": "expense"})
        assert r.status_code == 401

    def test_hide_and_persist(self, api):
        self._cleanup_hidden(api)
        r = api.post(f"{BASE_URL}/api/categories/hide",
                     json={"name": "TEST_Cat", "type": "expense"}, headers=AUTH)
        assert r.status_code == 200
        u = r.json()
        assert any(h["name"] == "TEST_Cat" and h["type"] == "expense"
                   for h in u["hidden_categories"])
        # GET /auth/me confirms
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        assert any(h["name"] == "TEST_Cat" for h in me["hidden_categories"])
        self._cleanup_hidden(api)

    def test_hide_dedupes(self, api):
        self._cleanup_hidden(api)
        api.post(f"{BASE_URL}/api/categories/hide",
                 json={"name": "TEST_Dup", "type": "expense"}, headers=AUTH)
        api.post(f"{BASE_URL}/api/categories/hide",
                 json={"name": "TEST_Dup", "type": "expense"}, headers=AUTH)
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        matches = [h for h in me["hidden_categories"]
                   if h["name"] == "TEST_Dup" and h["type"] == "expense"]
        assert len(matches) == 1, f"Expected dedupe, got {matches}"
        self._cleanup_hidden(api)

    def test_hide_other_returns_400(self, api):
        r = api.post(f"{BASE_URL}/api/categories/hide",
                     json={"name": "Other", "type": "expense"}, headers=AUTH)
        assert r.status_code == 400
        # case-insensitive
        r2 = api.post(f"{BASE_URL}/api/categories/hide",
                      json={"name": "other", "type": "expense"}, headers=AUTH)
        assert r2.status_code == 400

    def test_hide_invalid_type_400(self, api):
        r = api.post(f"{BASE_URL}/api/categories/hide",
                     json={"name": "Food", "type": "bogus"}, headers=AUTH)
        assert r.status_code == 400

    def test_hide_empty_name_400(self, api):
        r = api.post(f"{BASE_URL}/api/categories/hide",
                     json={"name": "   ", "type": "expense"}, headers=AUTH)
        assert r.status_code == 400


# ---------- Language setting ----------
class TestLanguage:
    def _reset_lang(self, api):
        api.put(f"{BASE_URL}/api/user/settings",
                json={"language": "en"}, headers=AUTH)

    def test_default_is_en_or_valid(self, api):
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        assert me["language"] in ("en", "fr", "es")

    def test_set_fr_persists(self, api):
        r = api.put(f"{BASE_URL}/api/user/settings",
                    json={"language": "fr"}, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["language"] == "fr"
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        assert me["language"] == "fr"
        self._reset_lang(api)

    def test_set_es_persists(self, api):
        r = api.put(f"{BASE_URL}/api/user/settings",
                    json={"language": "es"}, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["language"] == "es"
        self._reset_lang(api)

    def test_invalid_lang_400(self, api):
        r = api.put(f"{BASE_URL}/api/user/settings",
                    json={"language": "xx"}, headers=AUTH)
        assert r.status_code == 400

    def test_set_en_ok(self, api):
        r = api.put(f"{BASE_URL}/api/user/settings",
                    json={"language": "en"}, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["language"] == "en"


# ---------- Restore canonical DB state ----------
class TestZRestoreState:
    """Runs last (Z prefix) — leaves DB clean per iter-7 requirements:
       language en, hidden_categories [], salary 3500, goal 'Trip to Japan' 5000 present."""

    def test_reset_language_en(self, api):
        r = api.put(f"{BASE_URL}/api/user/settings",
                    json={"language": "en"}, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["language"] == "en"

    def test_clear_hidden_categories(self, api):
        # Direct DB cleanup of hidden_categories
        from pymongo import MongoClient
        from dotenv import load_dotenv
        from pathlib import Path
        load_dotenv(Path("/app/backend/.env"))
        c = MongoClient(os.environ["MONGO_URL"])
        db = c[os.environ["DB_NAME"]]
        db.users.update_one({"user_id": "user_testseed001"},
                             {"$set": {"hidden_categories": []}})
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        assert me["hidden_categories"] == []

    def test_salary_is_3500(self, api):
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        # Restore if needed
        if abs(me["salary"] - 3500) > 1e-6:
            r = api.put(f"{BASE_URL}/api/finance/salary",
                        json={"salary": 3500}, headers=AUTH)
            assert r.status_code == 200

    def test_trip_to_japan_goal_exists(self, api):
        goals = api.get(f"{BASE_URL}/api/goals", headers=AUTH).json()
        trip = next((g for g in goals if g["name"] == "Trip to Japan"), None)
        if trip is None:
            r = api.post(f"{BASE_URL}/api/goals",
                         json={"name": "Trip to Japan", "target": 5000},
                         headers=AUTH)
            assert r.status_code == 200
