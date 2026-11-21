export type SyncStatus = 'pending' | 'synced';
export type ClassroomLanguage = 'es' | 'yua';

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  maya_subtitle?: string | null;
  body_text: string;
  speech_script: string;
  key_vocabulary: string[];
}

export interface BilingualPhrase {
  main: string;
  es: string;
  yua: string;
}

export interface BuilderChallenge {
  title: string;
  prompt_es: string;
  prompt_yua: string;
  tiles: string[];
  expected: string[];
  ok_msg: string;
  err_msg: string;
}

export interface MatchPair {
  id: number;
  es: string;
  yua: string;
  target: string;
}

export interface ListenChallenge {
  title: string;
  audio_text: string;
  question_es: string;
  question_yua: string;
  options: string[];
  correct_index: number;
  ok_msg: string;
}

export interface ExamChallenge {
  type: 'order' | 'choice';
  label_es: string;
  label_yua: string;
  tiles: string[];
  expected: string[];
  options: string[];
  correct?: number | null;
}

export interface InteractiveUnit {
  subtitle: string;
  speech_lang: string;
  vocab_title: string;
  vocab_desc: string;
  phrases: BilingualPhrase[];
  builder: BuilderChallenge;
  pairs: MatchPair[];
  listen: ListenChallenge;
  exam: ExamChallenge[];
}

export interface CoursePackage {
  id: string;
  version: string;
  title: string;
  maya_title: string;
  skill_tag: string;
  badge_name: string;
  level: string;
  module_count: number;
  estimated_minutes: number;
  size_kb: number;
  video_compare_mb?: number;
  description: string;
  lesson: Lesson;
  quiz: QuizQuestion[];
  interactive_unit?: InteractiveUnit | null;
}

export interface OfflineCourseRecord extends CoursePackage {
  downloadedAt: string;
}

export interface ProgressRecord {
  id?: number;
  courseId: string;
  courseTitle: string;
  skillTag: string;
  badgeName: string;
  score: number;
  maxScore: number;
  passed: boolean;
  durationSeconds: number;
  attempts: number;
  validationHash: string;
  completedAt: string;
  syncStatus: SyncStatus;
  syncedAt?: string;
}

export interface SyncQueueItem {
  id?: number;
  clientEventId: string;
  candidateId: string;
  candidateName: string;
  community: string;
  primaryLanguage: string;
  courseId: string;
  courseTitle: string;
  skillTag: string;
  badgeName: string;
  score: number;
  maxScore: number;
  passed: boolean;
  durationSeconds: number;
  attempts: number;
  validationHash: string;
  completedAt: string;
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  fullName: string;
  community: string;
  primaryLanguage: string;
  streakDays: number;
  lastStudyDate?: string;
}

export interface CandidateCertificationOut {
  course_id: string;
  course_title: string;
  skill_tag: string;
  badge_name: string;
  score: number;
  max_score: number;
  passed: boolean;
  duration_seconds: number;
  attempts: number;
  validation_hash: string;
  completed_at: string;
  synced_at: string;
}

export interface CandidateOut {
  id: string;
  full_name: string;
  community: string;
  primary_language: string;
  certifications: CandidateCertificationOut[];
}

export interface VerificationResult {
  verified: boolean;
  validation_hash: string;
  candidate_name?: string | null;
  community?: string | null;
  course_title?: string | null;
  badge_name?: string | null;
  score?: number | null;
  max_score?: number | null;
  duration_seconds?: number | null;
  completed_at?: string | null;
  synced_at?: string | null;
}

export interface AnalyticsSummary {
  total_candidates: number;
  total_certifications: number;
  pass_rate_pct: number;
  avg_duration_seconds: number;
  communities: Record<string, number>;
  skills: Record<string, number>;
}
