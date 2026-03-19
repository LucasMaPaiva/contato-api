import { WebSocket } from "ws";
import { GameStateModel } from "./entities";
import { GameState } from "./types";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const rooms: Record<string, GameState> = {};

export function createEmptyRoomState(roomCode: string): GameState {
  return {
    roomCode,
    master: null,
    masterName: "",
    word: "",
    revealedLetters: "",
    gameStatus: "playing",
    players: [],
    clues: [],
    resetVote: null,
  };
}

export async function loadRoomStates() {
  const states = await GameStateModel.find();
  for (const state of states) {
    const roomState = state.toObject() as GameState;
    if (!roomState.roomCode) {
      continue;
    }
    rooms[roomState.roomCode] = roomState;
  }
}

export function getRoomState(roomCode: string) {
  return rooms[roomCode];
}

function generateRoomCode() {
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    const charIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    suffix += ROOM_CODE_ALPHABET[charIndex];
  }
  return `CONT-${suffix}`;
}

export async function createRoomState() {
  let roomCode = generateRoomCode();
  while (rooms[roomCode] || (await GameStateModel.exists({ roomCode }))) {
    roomCode = generateRoomCode();
  }

  const roomState = createEmptyRoomState(roomCode);
  rooms[roomCode] = roomState;
  await saveRoomState(roomState);
  return roomState;
}

export async function saveRoomState(roomState: GameState) {
  await GameStateModel.findOneAndUpdate({ roomCode: roomState.roomCode }, roomState, { upsert: true });
}

export async function deleteRoomState(roomCode: string) {
  delete rooms[roomCode];
  await GameStateModel.deleteOne({ roomCode });
}

export async function resetRoomState(roomCode: string, players: any[]) {
  const currentRoom = rooms[roomCode];
  if (!currentRoom) {
    return;
  }

  rooms[roomCode] = {
    ...createEmptyRoomState(roomCode),
    players,
  };
  await saveRoomState(rooms[roomCode]);
}

export function broadcastToRoom(wss: any, roomCode: string, data: any) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN && client.roomCode === roomCode) {
      client.send(message);
    }
  });
}
