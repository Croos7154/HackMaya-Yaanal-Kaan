from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Base declarativa SQLAlchemy compatible con PostgreSQL y SQLite."""


class CandidateRecord(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    community: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    primary_language: Mapped[str] = mapped_column(String(60), default="Español / Maya")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CertificationRecord(Base):
    __tablename__ = "certifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    course_title: Mapped[str] = mapped_column(String(160), nullable=False)
    skill_tag: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    badge_name: Mapped[str] = mapped_column(String(120), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    validation_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# --- Esquemas Pydantic (API Contracts) ---


class QuizQuestionSchema(BaseModel):
    id: str
    prompt: str
    options: List[str]
    correct_index: int
    explanation: str


class LessonSchema(BaseModel):
    id: str
    title: str
    maya_subtitle: Optional[str] = None
    body_text: str
    speech_script: str
    key_vocabulary: List[str] = Field(default_factory=list)


class BilingualPhraseSchema(BaseModel):
    main: str
    es: str
    yua: str


class BuilderChallengeSchema(BaseModel):
    title: str
    prompt_es: str
    prompt_yua: str
    tiles: List[str]
    expected: List[str]
    ok_msg: str
    err_msg: str


class MatchPairSchema(BaseModel):
    id: int
    es: str
    yua: str
    target: str


class ListenChallengeSchema(BaseModel):
    title: str
    audio_text: str
    question_es: str
    question_yua: str
    options: List[str]
    correct_index: int
    ok_msg: str


class ExamChallengeSchema(BaseModel):
    type: str  # "order" | "choice"
    label_es: str
    label_yua: str
    tiles: List[str] = Field(default_factory=list)
    expected: List[str] = Field(default_factory=list)
    options: List[str] = Field(default_factory=list)
    correct: Optional[int] = None


class InteractiveUnitSchema(BaseModel):
    subtitle: str
    speech_lang: str = "en-US"
    vocab_title: str
    vocab_desc: str
    phrases: List[BilingualPhraseSchema]
    builder: BuilderChallengeSchema
    pairs: List[MatchPairSchema]
    listen: ListenChallengeSchema
    exam: List[ExamChallengeSchema]


class CoursePackageSchema(BaseModel):
    id: str
    version: str = "1.0.0"
    title: str
    maya_title: str
    skill_tag: str
    badge_name: str
    level: str
    module_count: int = 5
    estimated_minutes: int
    size_kb: int
    video_compare_mb: int = 45
    description: str
    lesson: LessonSchema
    quiz: List[QuizQuestionSchema]
    interactive_unit: Optional[InteractiveUnitSchema] = None


class SyncEventItem(BaseModel):
    client_event_id: str
    candidate_id: str
    candidate_name: str
    community: str
    primary_language: str = "Español / Maya"
    course_id: str
    course_title: str
    skill_tag: str
    badge_name: str
    score: int = Field(ge=0, le=10)
    max_score: int = Field(ge=1, le=10)
    passed: bool
    duration_seconds: int = Field(default=0, ge=0)
    attempts: int = Field(default=1, ge=1)
    validation_hash: str = Field(min_length=8, max_length=128)
    completed_at: datetime


class SyncBatchRequest(BaseModel):
    events: List[SyncEventItem]


class SyncedItemAck(BaseModel):
    client_event_id: str
    validation_hash: str
    status: str  # "created" | "already_synced"
    integrity_verified: bool = True


class SyncBatchResponse(BaseModel):
    synced_count: int
    acks: List[SyncedItemAck]
    server_timestamp: datetime


class CandidateCertificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    course_id: str
    course_title: str
    skill_tag: str
    badge_name: str
    score: int
    max_score: int
    passed: bool
    duration_seconds: int
    attempts: int
    validation_hash: str
    completed_at: datetime
    synced_at: datetime


class CandidateOut(BaseModel):
    id: str
    full_name: str
    community: str
    primary_language: str
    certifications: List[CandidateCertificationOut]


class VerificationResponse(BaseModel):
    verified: bool
    validation_hash: str
    candidate_name: Optional[str] = None
    community: Optional[str] = None
    course_title: Optional[str] = None
    badge_name: Optional[str] = None
    score: Optional[int] = None
    max_score: Optional[int] = None
    duration_seconds: Optional[int] = None
    completed_at: Optional[datetime] = None
    synced_at: Optional[datetime] = None


class AnalyticsSummaryOut(BaseModel):
    total_candidates: int
    total_certifications: int
    pass_rate_pct: int
    avg_duration_seconds: int
    communities: dict[str, int]
    skills: dict[str, int]
