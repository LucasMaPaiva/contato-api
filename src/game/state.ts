import { WebSocket } from "ws";
import { GameStateModel } from "./entities";
import { GameState } from "./types";

export let gameState: GameState = {
  master: null,
  masterName: "",
  word: "",
  revealedLetters: "",
  gameStatus: "playing",
  players: [],
  clues: [],
};

// Carregar estado inicial do banco ao iniciar o servidor
export async function loadGameState() {
  const state = await GameStateModel.findOne({ key: 'current_game' });
  if (state) {
    gameState = state.toObject() as GameState;
  } else {
    const newState = new GameStateModel({ key: 'current_game', ...gameState });
    await newState.save();
  }
}

export async function saveGameState() {
  await GameStateModel.findOneAndUpdate({ key: 'current_game' }, gameState, { upsert: true });
}

export async function resetGameState(players: any[]) {
  gameState = {
    master: null,
    masterName: "",
    word: "",
    revealedLetters: "",
    gameStatus: "playing",
    players,
    clues: [],
  };
  await saveGameState();
}

export function broadcast(wss: any, data: any) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
