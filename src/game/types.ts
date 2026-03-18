import { Player } from "../shared/types";

export type ClueStatus = 'pending' | 'contacted' | 'blocked' | 'resolved' | 'failed';

export type Clue = {
  id: string;
  player: string;
  text: string;
  authorWord: string;
  status: ClueStatus;
  contactPlayer?: string;
  guessWord?: string;
  countdown?: number;
  pendingCountdown?: number;
};

export type GameStatus = "playing" | "won";

export type GameState = {
  master: string | null;
  masterName: string;
  word: string;
  revealedLetters: string;
  gameStatus: GameStatus;
  players: Player[];
  clues: Clue[];
};
