import { GameState } from "../game/types";
import { Player } from "../shared/types";

export type SocketMessageType = 
  | "JOIN" 
  | "BECOME_MASTER" 
  | "SET_WORD" 
  | "SEND_CLUE" 
  | "CONTACT" 
  | "BLOCK" 
  | "CHAT_MESSAGE" 
  | "RESET";

export interface SocketMessage {
  type: SocketMessageType;
  [key: string]: any;
}

export interface ServerMessage {
  type: string;
  [key: string]: any;
}
