export type Room = {
  id?: string;
  roomId?: string;
  roomCode: string;
  status: 'open' | 'in_spin' | string;
  createdAt?: string;
};

export type RoomMember = {
  userId: string;
  username: string;
  isConnected?: boolean;
  status?: string;
};

export type RoomState = Room & {
  ownerId: string;
  members: RoomMember[];
};