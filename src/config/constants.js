export const COMPETITION_CONSTANTS = {
  TITLE: 'Powering Performance 2026 – The Ultimate Quality Challenge',
  MAX_TEAMS: 20,
  MEMBERS_PER_TEAM: 5,
  ROUNDS: {
    ROUND_1: {
      ID: 1,
      NAME: 'Fastest Finger First',
      QUESTIONS_COUNT: 5,
      DEFAULT_TIMER: 30, // seconds
      BASE_POINTS: 10,
      BONUS_POINTS: 5,
      BONUS_THRESHOLD_SECONDS: 15
    },
    ROUND_2: {
      ID: 2,
      NAME: 'Guess the Defect',
      QUESTIONS_COUNT: 5,
      DEFAULT_TIMER: 15, // seconds
      ALL_CORRECT_POINTS: 10,
      PARTIAL_CORRECT_POINTS: 5, // 3 or more correct
      PENALTY_POINTS: -5 // fewer than 3 correct or timeout
    },
    ROUND_3: {
      ID: 3,
      NAME: 'Quality MSQ',
      QUESTIONS_COUNT: 5,
      DEFAULT_TIMER: 30, // seconds
      CORRECT_POINTS: 20,
      WRONG_PENALTY: -10,
      UNATTEMPTED_PENALTY: -15,
      PARTICIPANT_ROLE: 'CAPTAIN'
    }
  },
  STATUS: {
    COMPETITION: {
      NOT_STARTED: 'NOT_STARTED',
      RUNNING: 'RUNNING',
      PAUSED: 'PAUSED',
      COMPLETED: 'COMPLETED'
    },
    QUESTION: {
      IDLE: 'IDLE',
      ACTIVE: 'ACTIVE',
      PAUSED: 'PAUSED',
      ENDED: 'ENDED',
      REVEALED: 'REVEALED'
    },
    TEAM: {
      APPROVED: 'approved',
      PENDING: 'pending',
      REJECTED: 'rejected'
    }
  }
};
