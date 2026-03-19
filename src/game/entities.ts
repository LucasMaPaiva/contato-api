import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
});

const ClueSchema = new mongoose.Schema({
  id: { type: String, required: true },
  player: { type: String, required: true },
  text: { type: String, required: true },
  authorWord: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'contacted', 'blocked', 'resolved', 'failed'],
    default: 'pending' 
  },
  contactPlayer: String,
  guessWord: String,
  countdown: Number,
  pendingCountdown: Number,
});

const ResetVoteSchema = new mongoose.Schema({
  requestedById: { type: String, required: true },
  requestedByName: { type: String, required: true },
  votes: [{ type: String, required: true }],
}, { _id: false });

const GameStateSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  master: String,
  masterName: String,
  word: { type: String, default: "" },
  revealedLetters: { type: String, default: "" },
  gameStatus: { type: String, enum: ['playing', 'won'], default: 'playing' },
  players: [PlayerSchema],
  clues: [ClueSchema],
  resetVote: { type: ResetVoteSchema, default: null },
});

export const GameStateModel = mongoose.model('GameState', GameStateSchema);
