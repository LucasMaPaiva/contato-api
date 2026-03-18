import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
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

const GameStateSchema = new mongoose.Schema({
  key: { type: String, default: 'current_game', unique: true },
  master: String,
  masterName: String,
  word: { type: String, default: "" },
  revealedLetters: { type: String, default: "" },
  gameStatus: { type: String, enum: ['playing', 'won'], default: 'playing' },
  players: [PlayerSchema],
  clues: [ClueSchema],
});

export const GameStateModel = mongoose.model('GameState', GameStateSchema);
