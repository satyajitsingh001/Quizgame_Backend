import Question from '../models/Question.js';
import { createAuditLog } from '../middleware/auth.js';

export const getQuestions = async (req, res) => {
  try {
    const { round } = req.query;
    const filter = {};
    if (round) {
      filter.round = parseInt(round);
    }
    const questions = await Question.find(filter).sort({ round: 1, questionNumber: 1 });
    return res.status(200).json({ success: true, count: questions.length, questions });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching questions', error: error.message });
  }
};

export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    return res.status(200).json({ success: true, question });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching question', error: error.message });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const {
      round,
      questionNumber,
      prompt,
      description,
      timerSeconds,
      round1Activities,
      round1CorrectOrder,
      round2ImageUrl,
      round2Defects,
      round2TermOptions,
      round3Options,
      round3CorrectOptions,
      pointsConfig
    } = req.body;

    const existing = await Question.findOne({ round, questionNumber });
    if (existing) {
      return res.status(400).json({
        message: `Round ${round} Question ${questionNumber} already exists. Please edit or delete it first.`
      });
    }

    const question = await Question.create({
      round,
      questionNumber,
      prompt,
      description,
      timerSeconds,
      round1Activities,
      round1CorrectOrder,
      round2ImageUrl,
      round2Defects,
      round2TermOptions,
      round3Options,
      round3CorrectOptions,
      pointsConfig,
      isReady: true
    });

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'QUESTION_CREATED',
      module: 'QUESTIONS',
      reference: `R${round}-Q${questionNumber}`,
      newValue: { prompt: question.prompt },
      req
    });

    return res.status(201).json({ success: true, message: 'Question created successfully', question });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating question', error: error.message });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const previousValue = { prompt: question.prompt, round: question.round, questionNumber: question.questionNumber };

    Object.assign(question, updateData);
    await question.save();

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'QUESTION_UPDATED',
      module: 'QUESTIONS',
      reference: `R${question.round}-Q${question.questionNumber}`,
      previousValue,
      newValue: { prompt: question.prompt },
      req
    });

    return res.status(200).json({ success: true, message: 'Question updated successfully', question });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating question', error: error.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    await Question.findByIdAndDelete(id);

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'QUESTION_DELETED',
      module: 'QUESTIONS',
      reference: `R${question.round}-Q${question.questionNumber}`,
      previousValue: { prompt: question.prompt },
      req
    });

    return res.status(200).json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting question', error: error.message });
  }
};
