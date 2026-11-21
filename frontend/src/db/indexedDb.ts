import Dexie, { type Table } from 'dexie';
import type {
  CoursePackage,
  OfflineCourseRecord,
  ProgressRecord,
  StudentProfile,
  SyncQueueItem,
} from '../types/domain';

export class YaanalKaanDB extends Dexie {
  courses!: Table<OfflineCourseRecord, string>;
  progress!: Table<ProgressRecord, number>;
  sync_queue!: Table<SyncQueueItem, number>;
  student_profile!: Table<StudentProfile, string>;

  constructor() {
    super('yaanal_kaan_offline_db');
    this.version(1).stores({
      courses: 'id, skill_tag, downloadedAt',
      progress: '++id, courseId, validationHash, syncStatus, completedAt',
      sync_queue: '++id, clientEventId, validationHash, courseId, createdAt',
      student_profile: 'id, community',
    });
    this.version(2)
      .stores({
        courses: 'id, version, skill_tag, downloadedAt',
        progress: '++id, courseId, validationHash, syncStatus, completedAt',
        sync_queue: '++id, clientEventId, validationHash, courseId, createdAt',
        student_profile: 'id, community',
      })
      .upgrade(async (tx) => {
        await tx
          .table('student_profile')
          .toCollection()
          .modify((profile: Partial<StudentProfile>) => {
            if (typeof profile.streakDays !== 'number') {
              profile.streakDays = 1;
            }
          });
      });
  }
}

export const db = new YaanalKaanDB();

const DEFAULT_STUDENT: StudentProfile = {
  id: 'cand-carlos-fcp',
  fullName: 'Carlos Pech',
  community: 'Felipe Carrillo Puerto, Q. Roo',
  primaryLanguage: 'Español / Maya',
  streakDays: 1,
};

export async function ensureDefaultStudentProfile(): Promise<StudentProfile> {
  const existing = await db.student_profile.toCollection().first();
  if (existing) {
    if (typeof existing.streakDays !== 'number') {
      const updated = { ...existing, streakDays: 1 };
      await db.student_profile.put(updated);
      return updated;
    }
    return existing;
  }
  await db.student_profile.put(DEFAULT_STUDENT);
  return DEFAULT_STUDENT;
}

export async function updateStudentProfile(
  updates: Partial<Pick<StudentProfile, 'fullName' | 'community' | 'primaryLanguage'>>
): Promise<StudentProfile> {
  const current = await ensureDefaultStudentProfile();
  const next: StudentProfile = {
    ...current,
    ...updates,
  };
  await db.student_profile.put(next);
  return next;
}

export async function saveCourseOffline(course: CoursePackage): Promise<OfflineCourseRecord> {
  const record: OfflineCourseRecord = {
    ...course,
    downloadedAt: new Date().toISOString(),
  };
  await db.courses.put(record);
  return record;
}

export async function removeCourseAssetsOffline(courseId: string): Promise<void> {
  // Libera el paquete educativo de IndexedDB conservando intactas las certificaciones en `progress`
  await db.courses.delete(courseId);
}

export async function resetLocalOfflineStorage(): Promise<void> {
  await db.transaction('rw', db.courses, db.progress, db.sync_queue, db.student_profile, async () => {
    await db.courses.clear();
    await db.progress.clear();
    await db.sync_queue.clear();
    await db.student_profile.clear();
    await db.student_profile.put(DEFAULT_STUDENT);
  });
}

export async function computeValidationHash(payload: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const encoded = new TextEncoder().encode(payload);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    const hex = Array.from(new Uint8Array(digest))
      .slice(0, 6)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    return `YK-${hex.slice(0, 4)}-OFF-${hex.slice(4, 12)}`;
  }

  let hash = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hexFallback = (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `YK-${hexFallback.slice(0, 4)}-OFF-${hexFallback.slice(4, 8)}`;
}

export async function enqueueLessonEvaluation(params: {
  course: CoursePackage;
  score: number;
  maxScore: number;
  durationSeconds: number;
  attempts: number;
  student?: StudentProfile;
}): Promise<{ progress: ProgressRecord; queueItem: SyncQueueItem }> {
  const student = params.student ?? (await ensureDefaultStudentProfile());
  const now = new Date();
  const completedAt = now.toISOString();
  const todayKey = completedAt.slice(0, 10);
  const passed = params.score >= Math.ceil(params.maxScore * 0.66);
  const clientEventId =
    globalThis.crypto?.randomUUID?.() ?? `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const hashInput = [
    student.id,
    params.course.id,
    params.course.version,
    `${params.score}/${params.maxScore}`,
    `${params.durationSeconds}s`,
    completedAt,
  ].join('|');
  const validationHash = await computeValidationHash(hashInput);

  const progressRecord: ProgressRecord = {
    courseId: params.course.id,
    courseTitle: params.course.title,
    skillTag: params.course.skill_tag,
    badgeName: params.course.badge_name,
    score: params.score,
    maxScore: params.maxScore,
    passed,
    durationSeconds: params.durationSeconds,
    attempts: params.attempts,
    validationHash,
    completedAt,
    syncStatus: 'pending',
  };

  const queueRecord: SyncQueueItem = {
    clientEventId,
    candidateId: student.id,
    candidateName: student.fullName,
    community: student.community,
    primaryLanguage: student.primaryLanguage,
    courseId: params.course.id,
    courseTitle: params.course.title,
    skillTag: params.course.skill_tag,
    badgeName: params.course.badge_name,
    score: params.score,
    maxScore: params.maxScore,
    passed,
    durationSeconds: params.durationSeconds,
    attempts: params.attempts,
    validationHash,
    completedAt,
    createdAt: completedAt,
  };

  await db.transaction('rw', db.progress, db.sync_queue, db.student_profile, async () => {
    const progressId = await db.progress.add(progressRecord);
    progressRecord.id = progressId;
    const queueId = await db.sync_queue.add(queueRecord);
    queueRecord.id = queueId;

    const nextStreak =
      student.lastStudyDate && student.lastStudyDate !== todayKey
        ? (student.streakDays ?? 1) + 1
        : Math.max(1, student.streakDays ?? 1);

    await db.student_profile.put({
      ...student,
      streakDays: nextStreak,
      lastStudyDate: todayKey,
    });
  });

  return { progress: progressRecord, queueItem: queueRecord };
}
