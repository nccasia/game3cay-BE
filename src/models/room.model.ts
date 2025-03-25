export interface Room {
    id: string;
    name: string;
    wallet: number;
    members: string[];
    isPlaying: boolean;
    owner: string;
    readyPlayer: string[];
    medalHolder: string;
    sessionId: string;
    betAmount: number;
    allUserConfirmed: boolean;
    userConfirmed: string[];
  }
  