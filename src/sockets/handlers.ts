import { WebSocket } from "ws";
import {
  getRoomState,
  createRoomState,
  broadcastToRoom,
  resetRoomState,
  saveRoomState,
  deleteRoomState,
} from "../game/state";
import { SocketMessage } from "./types";
import { Player } from "../shared/types";

/**
 * Main entry point for processing incoming WebSocket messages.
 */
export async function handleSocketMessage(ws: WebSocket, wss: any, id: string, message: string) {
  const data: SocketMessage = JSON.parse(message);

  switch (data.type) {
    case "CREATE_ROOM":
      await handleCreateRoom(ws, wss, id, data.name);
      break;
    case "JOIN_ROOM":
      await handleJoinRoom(ws, wss, id, data.name, data.roomCode);
      break;
    case "BECOME_MASTER":
      await handleBecomeMaster(ws, wss, id, data.name);
      break;
    case "SET_WORD":
      await handleSetWord(ws, wss, id, data.word);
      break;
    case "SEND_CLUE":
      await handleSendClue(ws, wss, id, data.text, data.authorWord);
      break;
    case "CONTACT":
      await handleContact(ws, wss, id, data.clueId, data.guessWord);
      break;
    case "BLOCK":
      await handleBlock(ws, wss, id, data.clueId, data.masterGuess);
      break;
    case "CHAT_MESSAGE":
      handleChatMessage(ws, wss, data.player, data.text);
      break;
    case "REQUEST_RESET":
      await handleRequestReset(ws, wss, id);
      break;
    case "VOTE_RESET":
      await handleVoteReset(ws, wss, id);
      break;
  }
}

function getRoomCode(ws: WebSocket) {
  return (ws as any).roomCode as string | undefined;
}

function getRoomFromSocket(ws: WebSocket) {
  const roomCode = getRoomCode(ws);
  return roomCode ? getRoomState(roomCode) : undefined;
}

function sanitizeRoomCode(roomCode: string) {
  return (roomCode || "").trim().toUpperCase();
}

function getRequiredVotes(playersCount: number) {
  return Math.floor(playersCount / 2) + 1;
}

function hasReachedResetMajority(roomState: any) {
  if (!roomState.resetVote) {
    return false;
  }

  return roomState.resetVote.votes.length >= getRequiredVotes(roomState.players.length);
}

async function addPlayerToRoom(ws: WebSocket, wss: any, id: string, name: string, roomCode: string) {
  const roomState = getRoomState(roomCode);
  if (!roomState) {
    ws.send(JSON.stringify({ type: "ERROR", message: "Sala nao encontrada." }));
    return;
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    ws.send(JSON.stringify({ type: "ERROR", message: "Informe um nome valido." }));
    return;
  }

  const nameExists = roomState.players.some((player: Player) => player.name.toLowerCase() === normalizedName.toLowerCase());
  if (nameExists) {
    ws.send(JSON.stringify({ type: "ERROR", message: "Nome de usuário já está em uso." }));
    return;
  }

  roomState.players.push({ id, name: normalizedName });
  (ws as any).roomCode = roomCode;

  await saveRoomState(roomState);
  ws.send(JSON.stringify({ type: "INIT", id, roomCode, state: roomState }));
  broadcastToRoom(wss, roomCode, { type: "PLAYER_JOINED", players: roomState.players, state: roomState });
}

async function handleCreateRoom(ws: WebSocket, wss: any, id: string, name: string) {
  const roomState = await createRoomState();
  await addPlayerToRoom(ws, wss, id, name, roomState.roomCode);
}

async function handleJoinRoom(ws: WebSocket, wss: any, id: string, name: string, roomCode: string) {
  await addPlayerToRoom(ws, wss, id, name, sanitizeRoomCode(roomCode));
}

async function handleBecomeMaster(ws: WebSocket, wss: any, id: string, name: string) {
  const roomState = getRoomFromSocket(ws);
  if (roomState && !roomState.master) {
    roomState.master = id;
    roomState.masterName = name;
    roomState.word = "";
    roomState.revealedLetters = "";
    roomState.gameStatus = "playing";
    roomState.clues = [];
    roomState.resetVote = null;
    await saveRoomState(roomState);
    broadcastToRoom(wss, roomState.roomCode, { type: "STATE_UPDATE", state: roomState });
  }
}

async function handleSetWord(ws: WebSocket, wss: any, id: string, word: string) {
  const roomState = getRoomFromSocket(ws);
  if (roomState && roomState.master === id) {
    roomState.word = word.toUpperCase();
    roomState.revealedLetters = roomState.word[0] || "";
    roomState.gameStatus = "playing";
    await saveRoomState(roomState);
    broadcastToRoom(wss, roomState.roomCode, { type: "STATE_UPDATE", state: roomState });
  }
}

async function handleSendClue(ws: WebSocket, wss: any, id: string, text: string, authorWord: string) {
  const roomState = getRoomFromSocket(ws);
  if (!roomState) {
    return;
  }

  const player = roomState.players.find((currentPlayer: Player) => currentPlayer.id === id);
  const hasActiveClue = roomState.clues.some((clue: any) => clue.status === 'pending' || clue.status === 'contacted');
  const upperAuthorWord = authorWord.toUpperCase();
  const isWordBurned = roomState.clues.some((clue: any) => clue.status === 'blocked' && clue.authorWord === upperAuthorWord);
  if (player && roomState.master !== id && !hasActiveClue && !isWordBurned) {
    const newClue = {
      id: Math.random().toString(36).substring(7),
      player: player.name,
      text,
      authorWord: upperAuthorWord,
      status: 'pending' as const,
      pendingCountdown: 60,
    };
    roomState.clues.push(newClue);
    await saveRoomState(roomState);
    broadcastToRoom(wss, roomState.roomCode, { type: "STATE_UPDATE", state: roomState });

    const pendingTimer = setInterval(async () => {
      const currentRoom = getRoomState(roomState.roomCode);
      const currentClue = currentRoom?.clues.find((clue: any) => clue.id === newClue.id);
      if (!currentClue || currentClue.status !== 'pending') {
        clearInterval(pendingTimer);
        return;
      }

      if (currentClue.pendingCountdown! > 0) {
        currentClue.pendingCountdown!--;
        broadcastToRoom(wss, roomState.roomCode, { type: "STATE_UPDATE", state: currentRoom });
      } else {
        clearInterval(pendingTimer);
        currentClue.status = 'failed';
        if (currentRoom) {
          await saveRoomState(currentRoom);
          broadcastToRoom(wss, roomState.roomCode, { type: "STATE_UPDATE", state: currentRoom });
        }
      }
    }, 1000);
  }
}

async function handleContact(ws: WebSocket, wss: any, id: string, clueId: string, guessWord: string) {
  const roomState = getRoomFromSocket(ws);
  if (!roomState) {
    return;
  }

  const clue = roomState.clues.find((currentClue: any) => currentClue.id === clueId);
  const contactPlayer = roomState.players.find((player: Player) => player.id === id);
  if (clue && clue.status === 'pending' && contactPlayer && clue.player !== contactPlayer.name) {
    clue.status = 'contacted';
    clue.contactPlayer = contactPlayer.name;
    clue.guessWord = guessWord.toUpperCase();
    clue.countdown = 1;
    await saveRoomState(roomState);
    broadcastToRoom(wss, roomState.roomCode, { type: "STATE_UPDATE", state: roomState });

    const timer = setInterval(async () => {
      const currentRoom = getRoomState(roomState.roomCode);
      const currentClue = currentRoom?.clues.find((existingClue: any) => existingClue.id === clueId);
      if (!currentClue) {
        clearInterval(timer);
        return;
      }

      if (currentClue.status !== 'contacted') {
        clearInterval(timer);
        return;
      }
      if (currentClue.countdown! > 0) {
        currentClue.countdown!--;
        broadcastToRoom(wss, roomState.roomCode, { type: "STATE_UPDATE", state: currentRoom });
      } else {
        clearInterval(timer);
        if (currentClue.authorWord === currentClue.guessWord) {
          currentClue.status = 'resolved';
          if (!currentRoom) {
            return;
          }
          if (currentClue.authorWord === currentRoom.word || currentRoom.revealedLetters.length + 1 >= currentRoom.word.length) {
            currentRoom.revealedLetters = currentRoom.word;
            currentRoom.gameStatus = 'won';
          } else {
            if (currentRoom.revealedLetters.length < currentRoom.word.length) {
              currentRoom.revealedLetters = currentRoom.word.substring(0, currentRoom.revealedLetters.length + 1);
            }
          }
        } else {
          currentClue.status = 'failed';
        }
        if (currentRoom) {
          await saveRoomState(currentRoom);
          broadcastToRoom(wss, roomState.roomCode, { type: "STATE_UPDATE", state: currentRoom });
        }
      }
    }, 1000);
  }
}

async function handleBlock(ws: WebSocket, wss: any, id: string, clueId: string, masterGuess: string) {
  const roomState = getRoomFromSocket(ws);
  if (roomState && roomState.master === id) {
    const clueToBlock = roomState.clues.find((clue: any) => clue.id === clueId);
    if (clueToBlock && clueToBlock.status === 'pending') {
      const uMasterGuess = masterGuess.toUpperCase();
      if (uMasterGuess === clueToBlock.authorWord) {
        if (uMasterGuess === roomState.word) {
          clueToBlock.status = 'resolved';
          roomState.revealedLetters = roomState.word;
          roomState.gameStatus = 'won';
        } else {
          clueToBlock.status = 'blocked';
        }
        await saveRoomState(roomState);
        broadcastToRoom(wss, roomState.roomCode, { type: "STATE_UPDATE", state: roomState });
      }
    }
  }
}

function handleChatMessage(ws: WebSocket, wss: any, player: string, text: string) {
  const roomState = getRoomFromSocket(ws);
  if (!roomState) {
    return;
  }

  broadcastToRoom(wss, roomState.roomCode, {
    type: "CHAT_MESSAGE", 
    message: {
      id: Math.random().toString(36).substring(7),
      player,
      text,
      timestamp: new Date().toISOString()
    }
  });
}

async function handleRequestReset(ws: WebSocket, wss: any, id: string) {
  const roomCode = getRoomCode(ws);
  const roomState = getRoomFromSocket(ws);
  if (!roomCode || !roomState) {
    return;
  }

  const player = roomState.players.find((currentPlayer: Player) => currentPlayer.id === id);
  if (!player) {
    return;
  }

  if (!roomState.resetVote) {
    roomState.resetVote = {
      requestedById: id,
      requestedByName: player.name,
      votes: [id],
    };
  } else if (!roomState.resetVote.votes.includes(id)) {
    roomState.resetVote.votes.push(id);
  }

  if (hasReachedResetMajority(roomState)) {
    await resetRoomState(roomCode, roomState.players);
    const updatedRoom = getRoomState(roomCode);
    if (updatedRoom) {
      broadcastToRoom(wss, roomCode, { type: "STATE_UPDATE", state: updatedRoom });
    }
    return;
  }

  await saveRoomState(roomState);
  broadcastToRoom(wss, roomCode, { type: "STATE_UPDATE", state: roomState });
}

async function handleVoteReset(ws: WebSocket, wss: any, id: string) {
  const roomCode = getRoomCode(ws);
  const roomState = getRoomFromSocket(ws);
  if (!roomCode || !roomState || !roomState.resetVote) {
    return;
  }

  if (!roomState.resetVote.votes.includes(id)) {
    roomState.resetVote.votes.push(id);
  }

  if (hasReachedResetMajority(roomState)) {
    await resetRoomState(roomCode, roomState.players);
    const updatedRoom = getRoomState(roomCode);
    if (updatedRoom) {
      broadcastToRoom(wss, roomCode, { type: "STATE_UPDATE", state: updatedRoom });
    }
    return;
  }

  await saveRoomState(roomState);
  broadcastToRoom(wss, roomCode, { type: "STATE_UPDATE", state: roomState });
}

async function finalizeResetVoteAfterPlayerExit(roomCode: string, roomState: any, wss: any) {
  if (!roomState.resetVote) {
    await saveRoomState(roomState);
    broadcastToRoom(wss, roomCode, { type: "PLAYER_LEFT", players: roomState.players, master: roomState.master, state: roomState });
    return;
  }

  roomState.resetVote.votes = roomState.resetVote.votes.filter((voteId: string) => roomState.players.some((player: Player) => player.id === voteId));

  const requesterStillInRoom = roomState.players.some((player: Player) => player.id === roomState.resetVote.requestedById);
  if (!requesterStillInRoom || roomState.players.length < 2) {
    roomState.resetVote = null;
  }

  if (roomState.resetVote && hasReachedResetMajority(roomState)) {
    await resetRoomState(roomCode, roomState.players);
    const updatedRoom = getRoomState(roomCode);
    if (updatedRoom) {
      broadcastToRoom(wss, roomCode, { type: "STATE_UPDATE", state: updatedRoom });
    }
    return;
  }

  await saveRoomState(roomState);
  broadcastToRoom(wss, roomCode, { type: "PLAYER_LEFT", players: roomState.players, master: roomState.master, state: roomState });
}

export async function handleDisconnect(ws: WebSocket, id: string, wss: any) {
  const roomCode = getRoomCode(ws);
  if (!roomCode) {
    return;
  }

  const roomState = getRoomState(roomCode);
  if (!roomState) {
    return;
  }

  roomState.players = roomState.players.filter((player: Player) => player.id !== id);
  if (roomState.master === id) {
    roomState.master = null;
    roomState.masterName = "";
    roomState.word = "";
    roomState.revealedLetters = "";
    roomState.gameStatus = "playing";
    roomState.clues = [];
    roomState.resetVote = null;
  }

  delete (ws as any).roomCode;

  if (roomState.players.length === 0) {
    await deleteRoomState(roomCode);
    return;
  }

  await finalizeResetVoteAfterPlayerExit(roomCode, roomState, wss);
}
