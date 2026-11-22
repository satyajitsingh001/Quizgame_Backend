/**
 * Pure scoring calculation functions according to Confirmed Rules (Powering Performance 2026):
 * - Round 1 (Fastest Finger First): 60s per question.
 *   Points decrease by 0.2 per correct submission rank:
 *   1st: 2.0, 2nd: 1.8, 3rd: 1.6, 4th: 1.4, 5th: 1.2,
 *   6th: 1.0, 7th: 0.8, 8th: 0.6, 9th: 0.4, 10th: 0.2, 11th+: 0
 *   Incorrect answer: 0 pts. Unsubmitted/timeout: 0 pts.
 * - Round 2 (Guess the Defect): 45s per question.
 *   All defect matches correct: 2 pts.
 *   Incorrect or incomplete matching: 0 pts.
 *   No partial marks.
 * - Round 3 (Quality MSQ): 30s per question.
 *   Exact correct option combination: 2 pts.
 *   Incorrect combination / unattempted: 0 pts.
 *   No partial marks.
 * - Total Max Score across 3 rounds (15 questions): 30 points.
 */

export const evaluateRound1 = (submittedOrder, correctOrder, submissionRank = null, rulesConfig = {}) => {
  if (!submittedOrder || !Array.isArray(submittedOrder) || submittedOrder.length === 0) {
    return {
      isCorrect: false,
      rank: null,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 0,
      explanation: 'No submission within 60 seconds (0 pts)'
    };
  }

  // Exact sequence comparison
  const isExactMatch = 
    submittedOrder.length === correctOrder.length &&
    submittedOrder.every((val, idx) => val === correctOrder[idx]);

  if (!isExactMatch) {
    return {
      isCorrect: false,
      rank: null,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 0,
      explanation: 'Incorrect sequence order (0 pts)'
    };
  }

  // Submission is completely correct! Determine points by correct submission rank
  const rank = submissionRank && submissionRank > 0 ? submissionRank : 1;
  let points = 0;
  if (rank <= 10) {
    points = parseFloat((2.0 - (rank - 1) * 0.2).toFixed(1));
  } else {
    points = 0;
  }

  return {
    isCorrect: true,
    rank,
    basePoints: points,
    bonusPoints: 0,
    penaltyPoints: 0,
    totalScore: points,
    explanation: `Rank #${rank} correct submission (+${points} pts)`
  };
};

export const evaluateRound2 = (submittedMappings, correctDefects, rulesConfig = {}) => {
  const allCorrectPoints = 2;

  if (
    !submittedMappings ||
    (typeof submittedMappings !== 'object' && !Array.isArray(submittedMappings)) ||
    (Array.isArray(submittedMappings) && submittedMappings.length === 0) ||
    (!Array.isArray(submittedMappings) && Object.keys(submittedMappings).length === 0)
  ) {
    return {
      isCorrect: false,
      correctMatchesCount: 0,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 0,
      explanation: 'No submission within 45 seconds (0 pts)'
    };
  }

  const totalDefects = correctDefects.length;
  let correctCount = 0;

  if (Array.isArray(submittedMappings)) {
    // Array format: [placedIdSlot1, placedIdSlot2, placedIdSlot3, placedIdSlot4]
    correctDefects.forEach((defect, idx) => {
      const placed = submittedMappings[idx];
      if (
        placed !== undefined &&
        placed !== null &&
        (String(placed).trim().toLowerCase() === String(defect.id).trim().toLowerCase() ||
          String(placed).trim().toLowerCase() === String(defect.correctImageId || '').trim().toLowerCase() ||
          String(placed).trim().toLowerCase() === String(defect.correctTerm).trim().toLowerCase() ||
          (defect.imageUrl && String(placed).trim() === String(defect.imageUrl).trim()))
      ) {
        correctCount++;
      }
    });
  } else {
    // Object format: { [zoneId]: placedIdOrTerm }
    correctDefects.forEach(defect => {
      const userTerm = submittedMappings[defect.id];
      if (
        userTerm !== undefined &&
        userTerm !== null &&
        (String(userTerm).trim().toLowerCase() === String(defect.correctImageId || '').trim().toLowerCase() ||
          String(userTerm).trim().toLowerCase() === String(defect.correctTerm).trim().toLowerCase() ||
          String(userTerm).trim().toLowerCase() === String(defect.id).trim().toLowerCase() ||
          (defect.imageUrl && String(userTerm).trim() === String(defect.imageUrl).trim()))
      ) {
        correctCount++;
      }
    });
  }

  if (correctCount === totalDefects && totalDefects > 0) {
    return {
      isCorrect: true,
      correctMatchesCount: correctCount,
      basePoints: allCorrectPoints,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: allCorrectPoints,
      explanation: `All defect matches correct (+${allCorrectPoints} pts)`
    };
  } else {
    return {
      isCorrect: false,
      correctMatchesCount: correctCount,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 0,
      explanation: `Incorrect or incomplete matching (${correctCount}/${totalDefects} correct) (0 pts)`
    };
  }
};

export const evaluateRound3 = (submittedOptions, correctOptions, rulesConfig = {}) => {
  const correctPoints = 2;

  if (!submittedOptions || !Array.isArray(submittedOptions) || submittedOptions.length === 0) {
    return {
      isCorrect: false,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 0,
      explanation: 'Unattempted / timeout (0 pts)'
    };
  }

  const sortedSubmitted = [...submittedOptions].sort();
  const sortedCorrect = [...correctOptions].sort();

  const isExactMatch =
    sortedSubmitted.length === sortedCorrect.length &&
    sortedSubmitted.every((opt, idx) => opt === sortedCorrect[idx]);

  if (isExactMatch) {
    return {
      isCorrect: true,
      basePoints: correctPoints,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: correctPoints,
      explanation: `Exact correct option combination (+${correctPoints} pts)`
    };
  } else {
    return {
      isCorrect: false,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 0,
      explanation: 'Incorrect option combination (0 pts)'
    };
  }
};
