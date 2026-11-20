import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';
import Team from '../models/Team.js';
import Question from '../models/Question.js';
import GameState from '../models/GameState.js';
import CompetitionSettings from '../models/CompetitionSettings.js';
import Response from '../models/Response.js';
import ScoreLedger from '../models/ScoreLedger.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quiz_game_2026';

export const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[Setup] Connected to MongoDB...');

    // 1. Ensure Quizmaster Admin Account exists
    const adminUser = process.env.ADMIN_DEFAULT_USER || 'admin';
    const adminPass = process.env.ADMIN_DEFAULT_PASS || 'Admin@2026';
    const hashedPassword = await bcrypt.hash(adminPass, 10);

    await Admin.findOneAndUpdate(
      { username: adminUser.toLowerCase() },
      {
        username: adminUser.toLowerCase(),
        password: hashedPassword,
        name: 'Chief Quizmaster',
        role: 'SUPER_ADMIN'
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`[Setup] Admin account initialized: ${adminUser}`);

    // 2. Default Competition Settings
    await CompetitionSettings.findOneAndUpdate(
      { key: 'GLOBAL_SETTINGS' },
      {
        key: 'GLOBAL_SETTINGS',
        competitionTitle: 'Powering Performance 2026 – The Ultimate Quality Challenge',
        subTitle: 'Think Fast. Identify Defects. Win the Challenge.',
        isRegistrationOpen: true,
        requireApproval: false,
        round1Timer: 30,
        round1Points: 10,
        round1Bonus: 5,
        round2Timer: 15,
        round2AllCorrectPoints: 10,
        round2PartialPoints: 5,
        round2PenaltyPoints: -5,
        round3Timer: 30,
        round3CorrectPoints: 20,
        round3WrongPenalty: -10,
        round3UnansweredPenalty: -15,
        isLeaderboardVisibleToTeams: true
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('[Setup] Competition settings initialized.');

    // 3. Ensure initial game state exists (without overwriting if already running)
    const existingState = await GameState.findOne({ key: 'LIVE_GAME_STATE' });
    if (!existingState) {
      await GameState.create({
        key: 'LIVE_GAME_STATE',
        competitionTitle: 'Powering Performance 2026 – The Ultimate Quality Challenge',
        status: 'NOT_STARTED',
        currentRound: null,
        currentQuestionNumber: null,
        currentQuestionId: null,
        questionStatus: 'IDLE',
        timerDuration: 30,
        isLeaderboardVisibleToTeams: true
      });
      console.log('[Setup] Game state initialized.');
    }
  } catch (err) {
    console.error('[Setup Error]:', err);
  }
};

// If run directly via CLI
if (process.argv[1]?.endsWith('seedData.js')) {
  seedDatabase().then(() => {
    mongoose.connection.close();
    process.exit(0);
  });
}
