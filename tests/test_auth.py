import uuid
import os

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Importing the existing app initializes provider clients, but auth tests do not call them.
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("GROQ_MODEL", "openai/gpt-oss-120b")

from app.api.dependencies import get_db
from app.db.base import Base
from app.main import app
from app.models import User


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test-only-secret-with-at-least-32-chars")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    testing_session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def register(client, email="learner@example.com", password="correct-horse-42"):
    return client.post("/auth/register", json={"email": email, "password": password})


def test_successful_registration_stores_hash(client):
    response = register(client)
    assert response.status_code == 201
    assert response.json()["email"] == "learner@example.com"
    db = next(app.dependency_overrides[get_db]())
    try:
        user = db.query(User).one()
        assert user.password_hash != "correct-horse-42"
        assert user.password_hash.startswith("$argon2")
    finally:
        db.close()


def test_duplicate_email(client):
    assert register(client).status_code == 201
    assert register(client, email="LEARNER@example.com").status_code == 409


def test_successful_login(client):
    register(client)
    response = client.post("/auth/login", json={"email": "learner@example.com", "password": "correct-horse-42"})
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_incorrect_password(client):
    register(client)
    response = client.post("/auth/login", json={"email": "learner@example.com", "password": "incorrect-password"})
    assert response.status_code == 401


def test_invalid_token(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer definitely.invalid.token"})
    assert response.status_code == 401


def test_expired_token(client):
    expired = jwt.encode(
        {"sub": str(uuid.uuid4()), "iat": 1, "exp": 2},
        "test-only-secret-with-at-least-32-chars",
        algorithm="HS256",
    )
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401


def test_protected_endpoint_without_authentication(client):
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert client.post("/ask", json={"question": "What is in my PDF?"}).status_code == 401
