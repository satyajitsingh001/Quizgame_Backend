/**
 * Pure scoring calculation functions according to PRD Rules.
 */

export const evaluateRound1 = (submittedOrder, correctOrder, submissionTimeSeconds, isFastestWinner = false) => {
  if (!submittedOrder || !Array.isArray(submittedOrder) || submittedOrder.length === 0) {
    return {
      isCorrect: false,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 0,
      explanation: 'No submission or timed out (0 pts)'
    };
  }

  // Exact sequence comparison
  const isExactMatch = 
    submittedOrder.length === correctOrder.length &&
    submittedOrder.every((val, idx) => val === correctOrder[idx]);

  if (!isExactMatch) {
    return {
      isCorrect: false,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 0,
      explanation: 'Incorrect sequence order (0 pts)'
    };
  }

  const basePoints = 10;
  const bonusPoints = isFastestWinner ? 5 : 0;
  const totalScore = basePoints + bonusPoints;

  return {
    isCorrect: true,
    basePoints,
    bonusPoints,
    penaltyPoints: 0,
    totalScore,
    explanation: isFastestWinner
      ? `Correct sequence (+10 pts) + Fastest correct within 15s bonus (+5 pts) = ${totalScore} pts`
      : 'Correct sequence (+10 pts)'
  };
};

export const evaluateRound2 = (submittedMappings, correctDefects) => {
  // correctDefects is array of { id, label, correctTerm }
  if (!submittedMappings || typeof submittedMappings !== 'object' || Object.keys(submittedMappings).length === 0) {
    return {
      isCorrect: false,
      correctMatchesCount: 0,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: -5,
      totalScore: -5,
      explanation: 'Unanswered or timed out (-5 pts penalty)'
    };
  }

  const totalDefects = correctDefects.length;
  let correctCount = 0;

  correctDefects.forEach(defect => {
    const userTerm = submittedMappings[defect.id];
    if (userTerm && userTerm.trim().toLowerCase() === defect.correctTerm.trim().toLowerCase()) {
      correctCount++;
    }
  });

  if (correctCount === totalDefects) {
    return {
      isCorrect: true,
      correctMatchesCount: correctCount,
      basePoints: 10,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 10,
      explanation: `All ${correctCount}/${totalDefects} defect matches correct (+10 pts)`
    };
  } else if (correctCount >= 3) {
    return {
      isCorrect: false,
      correctMatchesCount: correctCount,
      basePoints: 5,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 5,
      explanation: `${correctCount}/${totalDefects} correct matches (Partial credit +5 pts)`
    };
  } else {
    return {
      isCorrect: false,
      correctMatchesCount: correctCount,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: -5,
      totalScore: -5,
      explanation: `Only ${correctCount}/${totalDefects} correct matches. Fewer than 3 correct matches (-5 pts penalty)`
    };
  }
};

export const evaluateRound3 = (submittedOptions, correctOptions) => {
  // submittedOptions is array of option IDs, e.g. ['A', 'C']
  // correctOptions is array of option IDs, e.g. ['A', 'C']
  if (!submittedOptions || !Array.isArray(submittedOptions) || submittedOptions.length === 0) {
    return {
      isCorrect: false,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: -15,
      totalScore: -15,
      explanation: 'Unattempted question (-15 pts penalty)'
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
      basePoints: 20,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: 20,
      explanation: 'Exact correct combination selected (+20 pts)'
    };
  } else {
    return {
      isCorrect: false,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: -10,
      totalScore: -10,
      explanation: 'Incorrect option combination (-10 pts penalty)'
    };
  }
};
