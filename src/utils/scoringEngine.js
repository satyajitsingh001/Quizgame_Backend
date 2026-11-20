/**
 * Pure scoring calculation functions according to configured PRD Rules.
 */

export const evaluateRound1 = (submittedOrder, correctOrder, submissionTimeSeconds, isFastestWinner = false, rulesConfig = {}) => {
  const basePointsConfig = typeof rulesConfig.points === 'number' ? rulesConfig.points : 10;
  const bonusPointsConfig = typeof rulesConfig.bonus === 'number' ? rulesConfig.bonus : 5;
  const threshold = rulesConfig.bonusThresholdSeconds || 15;

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

  const basePoints = basePointsConfig;
  const bonusPoints = isFastestWinner ? bonusPointsConfig : 0;
  const totalScore = basePoints + bonusPoints;

  return {
    isCorrect: true,
    basePoints,
    bonusPoints,
    penaltyPoints: 0,
    totalScore,
    explanation: isFastestWinner
      ? `Correct sequence (+${basePoints} pts) + Fastest correct within ${threshold}s bonus (+${bonusPoints} pts) = ${totalScore} pts`
      : `Correct sequence (+${basePoints} pts)`
  };
};

export const evaluateRound2 = (submittedMappings, correctDefects, rulesConfig = {}) => {
  const allCorrectPoints = typeof rulesConfig.allCorrectPoints === 'number' ? rulesConfig.allCorrectPoints : 10;
  const partialPoints = typeof rulesConfig.partialPoints === 'number' ? rulesConfig.partialPoints : 5;
  const penaltyPoints = typeof rulesConfig.penaltyPoints === 'number' ? rulesConfig.penaltyPoints : -5;

  // correctDefects is array of { id, label, correctTerm }
  if (!submittedMappings || typeof submittedMappings !== 'object' || Object.keys(submittedMappings).length === 0) {
    return {
      isCorrect: false,
      correctMatchesCount: 0,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: penaltyPoints,
      totalScore: penaltyPoints,
      explanation: `Unanswered or timed out (${penaltyPoints} pts penalty)`
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
      basePoints: allCorrectPoints,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: allCorrectPoints,
      explanation: `All ${correctCount}/${totalDefects} defect matches correct (+${allCorrectPoints} pts)`
    };
  } else if (correctCount >= 3) {
    return {
      isCorrect: false,
      correctMatchesCount: correctCount,
      basePoints: partialPoints,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalScore: partialPoints,
      explanation: `${correctCount}/${totalDefects} correct matches (Partial credit +${partialPoints} pts)`
    };
  } else {
    return {
      isCorrect: false,
      correctMatchesCount: correctCount,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: penaltyPoints,
      totalScore: penaltyPoints,
      explanation: `Only ${correctCount}/${totalDefects} correct matches. Fewer than 3 correct matches (${penaltyPoints} pts penalty)`
    };
  }
};

export const evaluateRound3 = (submittedOptions, correctOptions, rulesConfig = {}) => {
  const correctPoints = typeof rulesConfig.correctPoints === 'number' ? rulesConfig.correctPoints : 20;
  const wrongPenalty = typeof rulesConfig.wrongPenalty === 'number' ? rulesConfig.wrongPenalty : -10;
  const unansweredPenalty = typeof rulesConfig.unansweredPenalty === 'number' ? rulesConfig.unansweredPenalty : -15;

  // submittedOptions is array of option IDs, e.g. ['A', 'C']
  // correctOptions is array of option IDs, e.g. ['A', 'C']
  if (!submittedOptions || !Array.isArray(submittedOptions) || submittedOptions.length === 0) {
    return {
      isCorrect: false,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: unansweredPenalty,
      totalScore: unansweredPenalty,
      explanation: `Unattempted question (${unansweredPenalty} pts penalty)`
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
      explanation: `Exact correct combination selected (+${correctPoints} pts)`
    };
  } else {
    return {
      isCorrect: false,
      basePoints: 0,
      bonusPoints: 0,
      penaltyPoints: wrongPenalty,
      totalScore: wrongPenalty,
      explanation: `Incorrect option combination (${wrongPenalty} pts penalty)`
    };
  }
};
