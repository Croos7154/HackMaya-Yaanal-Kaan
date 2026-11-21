from __future__ import annotations

import os
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.main import app, get_db  # noqa: E402
from app.models import Base  # noqa: E402
from app.seed_data import seed_database  # noqa: E402

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False
)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    with TestingSessionLocal() as db:
        seed_database(db)

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health_check(client: TestClient):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["service"] == "yaanal-kaan-api"


def test_list_courses_and_not_found(client: TestClient):
    res = client.get("/api/v1/courses")
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) == 2
    assert {c["id"] for c in courses} == {"ingles-turismo-01", "finanzas-artesanos-01"}
    for course in courses:
        assert len(course["quiz"]) == 3

    missing = client.get("/api/v1/courses/no-existe")
    assert missing.status_code == 404


def test_sync_is_idempotent_and_verifiable(client: TestClient):
    payload = {
        "events": [
            {
                "client_event_id": "evt-pytest-01",
                "candidate_id": "cand-carlos-fcp",
                "candidate_name": "Carlos Pech",
                "community": "Felipe Carrillo Puerto, Q. Roo",
                "primary_language": "Español / Maya",
                "course_id": "ingles-turismo-01",
                "course_title": "Inglés Básico para Turismo",
                "skill_tag": "Inglés Turístico",
                "badge_name": "Anfitrión Bilingüe Maya-Caribe",
                "score": 3,
                "max_score": 3,
                "passed": True,
                "duration_seconds": 45,
                "attempts": 1,
                "validation_hash": "YK-PYTEST-9911",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ]
    }

    first = client.post("/api/v1/sync", json=payload)
    assert first.status_code == 200
    first_data = first.json()
    assert first_data["synced_count"] == 1
    assert first_data["acks"][0]["status"] == "created"

    # Reenvío idempotente no debe duplicar la certificación
    second = client.post("/api/v1/sync", json=payload)
    assert second.status_code == 200
    second_data = second.json()
    assert second_data["synced_count"] == 0
    assert second_data["acks"][0]["status"] == "already_synced"

    verify_ok = client.get("/api/v1/verify/YK-PYTEST-9911")
    assert verify_ok.status_code == 200
    v_body = verify_ok.json()
    assert v_body["verified"] is True
    assert v_body["candidate_name"] == "Carlos Pech"
    assert v_body["duration_seconds"] == 45

    verify_missing = client.get("/api/v1/verify/YK-NO-EXISTE")
    assert verify_missing.status_code == 200
    assert verify_missing.json()["verified"] is False


def test_candidates_filters_and_analytics(client: TestClient):
    all_cands = client.get("/api/v1/candidates")
    assert all_cands.status_code == 200
    assert len(all_cands.json()) == 3

    filtered = client.get(
        "/api/v1/candidates",
        params={"community": "Puerto Morelos", "skill": "Inglés Turístico"},
    )
    assert filtered.status_code == 200
    data = filtered.json()
    assert len(data) == 1
    assert data[0]["full_name"] == "María Ixchel Chan"

    analytics = client.get("/api/v1/analytics")
    assert analytics.status_code == 200
    stats = analytics.json()
    assert stats["total_candidates"] == 3
    assert stats["total_certifications"] == 3
    assert stats["pass_rate_pct"] == 100
