from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Generator, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session, sessionmaker

load_dotenv()

from .models import (
    AnalyticsSummaryOut,
    Base,
    CandidateCertificationOut,
    CandidateOut,
    CandidateRecord,
    CertificationRecord,
    CoursePackageSchema,
    SyncBatchRequest,
    SyncBatchResponse,
    SyncedItemAck,
    VerificationResponse,
)
from .seed_data import COURSES_CATALOG, seed_database

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./yaanal_kaan.db")

engine_kwargs: dict = {"echo": False, "future": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def _ensure_certification_columns() -> None:
    """Agrega columnas nuevas si ya existía una base SQLite local previa."""
    inspector = inspect(engine)
    if not inspector.has_table("certifications"):
        return
    existing_cols = {col["name"] for col in inspector.get_columns("certifications")}
    statements: list[str] = []
    if "duration_seconds" not in existing_cols:
        statements.append(
            "ALTER TABLE certifications ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0"
        )
    if "attempts" not in existing_cols:
        statements.append(
            "ALTER TABLE certifications ADD COLUMN attempts INTEGER NOT NULL DEFAULT 1"
        )
    if statements:
        with engine.begin() as conn:
            for stmt in statements:
                conn.execute(text(stmt))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_certification_columns()
    with SessionLocal() as db:
        seed_database(db)
    yield


app = FastAPI(
    title="Yáanal Ka’an API",
    description=(
        "Backend Offline-First Sync & Talent Passport API para Hack Maya (DevFest Cancún 2026)."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/api/v1/health")
def health_check() -> dict[str, str]:
    db_backend = "sqlite" if DATABASE_URL.startswith("sqlite") else "postgresql"
    return {
        "status": "ok",
        "service": "yaanal-kaan-api",
        "database": db_backend,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/courses", response_model=list[CoursePackageSchema])
def list_courses() -> list[CoursePackageSchema]:
    """Devuelve el catálogo completo de paquetes offline listos para guardar en IndexedDB."""
    return COURSES_CATALOG


@app.get("/api/v1/courses/{course_id}", response_model=CoursePackageSchema)
def get_course(course_id: str) -> CoursePackageSchema:
    for course in COURSES_CATALOG:
        if course.id == course_id:
            return course
    raise HTTPException(status_code=404, detail=f"Curso '{course_id}' no encontrado.")


@app.post("/api/v1/sync", response_model=SyncBatchResponse)
def sync_offline_events(
    payload: SyncBatchRequest,
    db: Session = Depends(get_db),
) -> SyncBatchResponse:
    """Recibe el lote desde IndexedDB (sync_queue), valida consistencia y persiste."""
    now = datetime.now(timezone.utc)
    acks: list[SyncedItemAck] = []
    created_count = 0

    for item in payload.events:
        candidate = db.get(CandidateRecord, item.candidate_id)
        if candidate is None:
            candidate = CandidateRecord(
                id=item.candidate_id,
                full_name=item.candidate_name,
                community=item.community,
                primary_language=item.primary_language,
                created_at=now,
            )
            db.add(candidate)
            db.flush()
        else:
            candidate.full_name = item.candidate_name
            candidate.community = item.community
            candidate.primary_language = item.primary_language

        existing_cert = db.scalar(
            select(CertificationRecord).where(
                CertificationRecord.validation_hash == item.validation_hash
            )
        )

        if existing_cert is not None:
            acks.append(
                SyncedItemAck(
                    client_event_id=item.client_event_id,
                    validation_hash=item.validation_hash,
                    status="already_synced",
                    integrity_verified=True,
                )
            )
            continue

        cert = CertificationRecord(
            candidate_id=candidate.id,
            course_id=item.course_id,
            course_title=item.course_title,
            skill_tag=item.skill_tag,
            badge_name=item.badge_name,
            score=item.score,
            max_score=item.max_score,
            passed=item.passed,
            duration_seconds=item.duration_seconds,
            attempts=item.attempts,
            validation_hash=item.validation_hash,
            completed_at=item.completed_at,
            synced_at=now,
        )
        db.add(cert)
        created_count += 1
        acks.append(
            SyncedItemAck(
                client_event_id=item.client_event_id,
                validation_hash=item.validation_hash,
                status="created",
                integrity_verified=item.duration_seconds >= 0 and len(item.validation_hash) >= 8,
            )
        )

    db.commit()

    return SyncBatchResponse(
        synced_count=created_count,
        acks=acks,
        server_timestamp=now,
    )


@app.get("/api/v1/candidates", response_model=list[CandidateOut])
def list_candidates(
    community: Optional[str] = Query(default=None, description="Filtrar por comunidad"),
    skill: Optional[str] = Query(default=None, description="Filtrar por habilidad"),
    db: Session = Depends(get_db),
) -> list[CandidateOut]:
    """Portal B2B: lista candidatos certificados con filtros opcionales."""
    stmt = select(CandidateRecord).order_by(CandidateRecord.created_at.desc())
    if community:
        stmt = stmt.where(CandidateRecord.community.ilike(f"%{community}%"))

    candidates = db.scalars(stmt).all()
    results: list[CandidateOut] = []

    for candidate in candidates:
        cert_stmt = select(CertificationRecord).where(
            CertificationRecord.candidate_id == candidate.id
        )
        if skill:
            cert_stmt = cert_stmt.where(CertificationRecord.skill_tag.ilike(f"%{skill}%"))
        certs = db.scalars(cert_stmt.order_by(CertificationRecord.completed_at.desc())).all()

        if skill and not certs:
            continue

        results.append(
            CandidateOut(
                id=candidate.id,
                full_name=candidate.full_name,
                community=candidate.community,
                primary_language=candidate.primary_language,
                certifications=[
                    CandidateCertificationOut.model_validate(cert) for cert in certs
                ],
            )
        )

    return results


@app.get("/api/v1/verify/{validation_hash}", response_model=VerificationResponse)
def verify_passport_hash(
    validation_hash: str,
    db: Session = Depends(get_db),
) -> VerificationResponse:
    """Endpoint público para verificar un código QR de Pasaporte de Talento."""
    cert = db.scalar(
        select(CertificationRecord).where(
            CertificationRecord.validation_hash == validation_hash
        )
    )
    if cert is None:
        return VerificationResponse(verified=False, validation_hash=validation_hash)

    candidate = db.get(CandidateRecord, cert.candidate_id)
    return VerificationResponse(
        verified=True,
        validation_hash=cert.validation_hash,
        candidate_name=candidate.full_name if candidate else None,
        community=candidate.community if candidate else None,
        course_title=cert.course_title,
        badge_name=cert.badge_name,
        score=cert.score,
        max_score=cert.max_score,
        duration_seconds=cert.duration_seconds,
        completed_at=cert.completed_at,
        synced_at=cert.synced_at,
    )


@app.get("/api/v1/analytics", response_model=AnalyticsSummaryOut)
def get_analytics_summary(db: Session = Depends(get_db)) -> AnalyticsSummaryOut:
    """Métricas agregadas de tracción y tiempos para Portal B2B / B2G."""
    candidates = db.scalars(select(CandidateRecord)).all()
    certs = db.scalars(select(CertificationRecord)).all()

    total_certs = len(certs)
    passed_count = sum(1 for c in certs if c.passed)
    pass_rate = round((passed_count / total_certs) * 100) if total_certs > 0 else 0
    avg_duration = (
        round(sum(c.duration_seconds for c in certs) / total_certs) if total_certs > 0 else 0
    )

    communities: dict[str, int] = {}
    for cand in candidates:
        communities[cand.community] = communities.get(cand.community, 0) + 1

    skills: dict[str, int] = {}
    for cert in certs:
        skills[cert.skill_tag] = skills.get(cert.skill_tag, 0) + 1

    return AnalyticsSummaryOut(
        total_candidates=len(candidates),
        total_certifications=total_certs,
        pass_rate_pct=pass_rate,
        avg_duration_seconds=avg_duration,
        communities=communities,
        skills=skills,
    )
