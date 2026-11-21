export type UserRole = 'admin' | 'trainee';
export type AppLanguage = 'en' | 'bn' | 'hi';

export interface QuestionItem {
  id: string;
  label: string;
  labelBn?: string;
  labelHi?: string;
  shortLabel: string;
  description: string;
  descriptionBn?: string;
  descriptionHi?: string;
  active: boolean;
  order: number;
}

export interface PaperInfo {
  paperNumber: number;
  title: string;
  expectedTeachers: number;
}

export interface Teacher {
  id: string;
  code: string;
  name: string;
  phone?: string;
  paperNumber: number;
  subjectTopic: string;
  designation: string;
  features?: string;
  active?: boolean;
}

export interface TeacherRatingInput {
  teacherId: string;
  ratings?: Record<string, number>;
  clarity?: number;
  delivery?: number;
  engagement?: number;
  discipline?: number;
  comment: string;
}

export type EvaluationMap = Record<string, TeacherRatingInput>;

export interface TraineeSubmission {
  traineeId: string;
  chestNumber: number;
  status: 'pending' | 'draft' | 'submitted';
  evaluations: EvaluationMap;
  startedAt: string | null;
  updatedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number | null;
}

export interface SessionConfig {
  id: string;
  title: string;
  batchName: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  isClosedManually: boolean;
  completionNotifiedAt: string | null;
}

export interface SessionTimeState {
  status: 'scheduled' | 'open' | 'expired';
  remainingMs: number;
  formattedRemaining: string;
  isOpen: boolean;
  isScheduled: boolean;
  isExpired: boolean;
  urgency: 'normal' | 'warning' | 'expired' | 'scheduled';
}

export type NotificationType = 'trainee_submitted' | 'session_completed' | 'session_extended' | 'session_started';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  audience: 'admin' | 'all' | 'trainee';
  targetTraineeId?: string;
  title: string;
  message: string;
  createdAt: string;
  readByAdmin: boolean;
  metadata?: {
    submittedCount?: number;
    totalTrainees?: number;
    topTeacherName?: string;
    topTeacherScore?: number;
    traineeId?: string;
  };
}

export type PerformanceBand = 'Exemplary' | 'Proficient' | 'Developing' | 'Needs Attention' | 'No Data';

export interface TeacherCommentItem {
  traineeId: string;
  comment: string;
  averageRating: number;
  submittedAt: string;
}

export interface TeacherPerformanceStat {
  teacher: Teacher;
  responseCount: number;
  overallAverage: number;
  criteriaAverages: Record<string, number>;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  performanceBand: PerformanceBand;
  rank: number;
  comments: TeacherCommentItem[];
}

export interface PaperPerformanceStat {
  paperNumber: number;
  title: string;
  teacherCount: number;
  totalResponses: number;
  averageScore: number;
  topTeacherName: string | null;
  topTeacherScore: number;
}

export interface SubmissionTimelinePoint {
  label: string;
  submittedCount: number;
  cumulativeCount: number;
}

export interface TraineeRosterRow {
  traineeId: string;
  chestNumber: number;
  status: 'pending' | 'draft' | 'submitted';
  ratedCount: number;
  startedAt: string | null;
  updatedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number | null;
}

export interface AuthSessionUser {
  role: UserRole;
  id: string;
  displayName: string;
  chestNumber?: number;
}
