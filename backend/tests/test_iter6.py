"""Iteration 6 endpoints — templates (quick-add), savings goal, salary history."""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL",
                          "https://salary-manager-140.preview.emergentagent.com").rstrip("/")
TOKEN = "test_session_token_fixed_123456"
AUTH = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _wipe_templates(api):
    tpls = api.get(f"{BASE_URL}/api/templates", headers=AUTH).json()
    for t in tpls:
        api.delete(f"{BASE_URL}/api/templates/{t['id']}", headers=AUTH)


# ---------- Templates ----------
class TestTemplates:
    def test_list_requires_auth(self, api):
        r = requests.get(f"{BASE_URL}/api/templates")
        assert r.status_code == 401

    def test_create_requires_auth(self, api):
        r = requests.post(f"{BASE_URL}/api/templates",
                          json={"type": "expense", "amount": 1, "description": "x"})
        assert r.status_code == 401

    def test_delete_requires_auth(self, api):
        r = requests.delete(f"{BASE_URL}/api/templates/some-id")
        assert r.status_code == 401

    def test_create_and_list(self, api):
        _wipe_templates(api)
        payload = {"type": "expense", "amount": 2.5, "description": "TEST_Coffee", "category": "Food"}
        r = api.post(f"{BASE_URL}/api/templates", json=payload, headers=AUTH)
        assert r.status_code == 200, r.text
        tpl = r.json()
        assert tpl["type"] == "expense" and tpl["amount"] == 2.5
        assert tpl["description"] == "TEST_Coffee" and tpl["category"] == "Food"
        assert "id" in tpl and "created_at" in tpl
        assert "_id" not in tpl and "user_id" not in tpl
        # GET verify
        lst = api.get(f"{BASE_URL}/api/templates", headers=AUTH).json()
        assert any(t["id"] == tpl["id"] for t in lst)
        # cleanup
        api.delete(f"{BASE_URL}/api/templates/{tpl['id']}", headers=AUTH)

    def test_invalid_type_400(self, api):
        r = api.post(f"{BASE_URL}/api/templates",
                     json={"type": "bogus", "amount": 5, "description": "x"}, headers=AUTH)
        assert r.status_code == 400

    def test_zero_amount_400(self, api):
        r = api.post(f"{BASE_URL}/api/templates",
                     json={"type": "expense", "amount": 0, "description": "x"}, headers=AUTH)
        assert r.status_code == 400

    def test_negative_amount_400(self, api):
        r = api.post(f"{BASE_URL}/api/templates",
                     json={"type": "expense", "amount": -1, "description": "x"}, headers=AUTH)
        assert r.status_code == 400

    def test_empty_description_400(self, api):
        r = api.post(f"{BASE_URL}/api/templates",
                     json={"type": "expense", "amount": 1, "description": "   "}, headers=AUTH)
        assert r.status_code == 400

    def test_delete_unknown_404(self, api):
        r = api.delete(f"{BASE_URL}/api/templates/nonexistent-uuid-xxx", headers=AUTH)
        assert r.status_code == 404

    def test_delete_removes_it(self, api):
        r = api.post(f"{BASE_URL}/api/templates",
                     json={"type": "income", "amount": 100, "description": "TEST_del_tpl",
                           "category": "Freelance"}, headers=AUTH)
        tpl = r.json()
        d = api.delete(f"{BASE_URL}/api/templates/{tpl['id']}", headers=AUTH)
        assert d.status_code == 200
        lst = api.get(f"{BASE_URL}/api/templates", headers=AUTH).json()
        assert not any(t["id"] == tpl["id"] for t in lst)

    def test_20_template_limit(self, api):
        _wipe_templates(api)
        try:
            created = []
            for i in range(20):
                r = api.post(f"{BASE_URL}/api/templates",
                             json={"type": "expense", "amount": 1.0 + i,
                                   "description": f"TEST_bulk_{i}", "category": "Other"},
                             headers=AUTH)
                assert r.status_code == 200, f"failed at #{i}: {r.text}"
                created.append(r.json())
            # 21st should be rejected
            r = api.post(f"{BASE_URL}/api/templates",
                         json={"type": "expense", "amount": 99,
                               "description": "TEST_overflow", "category": "Other"},
                         headers=AUTH)
            assert r.status_code == 400, r.text
            assert "limit" in r.json().get("detail", "").lower()
        finally:
            _wipe_templates(api)


# ---------- (iter-7) /users/goal endpoints removed — see test_iter7.py TestGoals ----------


# ---------- Salary history ----------
class TestSalaryHistory:
    def test_put_salary_upserts_history_current_month(self, api):
        month_key = datetime.now(timezone.utc).strftime("%Y-%m")
        r = api.put(f"{BASE_URL}/api/finance/salary",
                    json={"salary": 4321.0}, headers=AUTH)
        assert r.status_code == 200
        u = r.json()
        assert abs(u["salary"] - 4321.0) < 1e-6
        assert "salary_history" in u
        entries = [h for h in u["salary_history"] if h["month"] == month_key]
        assert len(entries) == 1, f"Expected exactly one history entry for {month_key}, got: {u['salary_history']}"
        assert entries[0]["salary"] == 4321.0

    def test_same_month_updates_replace_not_duplicate(self, api):
        month_key = datetime.now(timezone.utc).strftime("%Y-%m")
        api.put(f"{BASE_URL}/api/finance/salary", json={"salary": 100}, headers=AUTH)
        api.put(f"{BASE_URL}/api/finance/salary", json={"salary": 200}, headers=AUTH)
        api.put(f"{BASE_URL}/api/finance/salary", json={"salary": 300}, headers=AUTH)
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        entries = [h for h in me["salary_history"] if h["month"] == month_key]
        assert len(entries) == 1
        assert entries[0]["salary"] == 300

    def test_me_returns_salary_history_and_new_fields(self, api):
        me = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH).json()
        assert "salary_history" in me
        assert isinstance(me["salary_history"], list)
        # iter-7 fields:
        assert "language" in me and me["language"] in ("en", "fr", "es")
        assert "hidden_categories" in me and isinstance(me["hidden_categories"], list)
        # iter-7: goal is no longer on the user
        assert "goal" not in me


# ---------- Final restore: put canonical demo state back ----------
class TestZRestoreCanonicalState:
    """Runs last (alphabetical) to leave DB in the state the frontend tests expect."""

    def test_restore_salary_3500(self, api):
        r = api.put(f"{BASE_URL}/api/finance/salary",
                    json={"salary": 3500.0}, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["salary"] == 3500.0

    def test_restore_goal_trip_to_japan(self, api):
        # Iter-7: goals now live in db.goals collection with contributions -> use /api/goals
        goals = api.get(f"{BASE_URL}/api/goals", headers=AUTH).json()
        trip = next((g for g in goals if g["name"] == "Trip to Japan"), None)
        if trip is None:
            r = api.post(f"{BASE_URL}/api/goals",
                         json={"name": "Trip to Japan", "target": 5000.0}, headers=AUTH)
            assert r.status_code == 200
            trip = r.json()
        assert trip["name"] == "Trip to Japan"
        assert trip["target"] == 5000.0

    def test_restore_single_coffee_template(self, api):
        _wipe_templates(api)
        r = api.post(f"{BASE_URL}/api/templates",
                     json={"type": "expense", "amount": 2.5,
                           "description": "Coffee", "category": "Food"},
                     headers=AUTH)
        assert r.status_code == 200
        lst = api.get(f"{BASE_URL}/api/templates", headers=AUTH).json()
        assert len(lst) == 1
        assert lst[0]["description"] == "Coffee"
