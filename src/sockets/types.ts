import { GameState } from "../game/types";
import { Player } from "../shared/types";

export type SocketMessageType = 
  | "CREATE_ROOM"
  | "JOIN_ROOM"
  | "BECOME_MASTER" 
  | "SET_WORD" 
  | "SEND_CLUE" 
  | "CONTACT" 
  | "BLOCK" 
  | "CHAT_MESSAGE" 
  | "REQUEST_RESET"
  | "VOTE_RESET";

export interface SocketMessage {
  type: SocketMessageType;
  [key: string]: any;
}

export interface ServerMessage {
  type: string;
  [key: string]: any;
}
