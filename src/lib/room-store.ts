import type { Room } from "./types";

const rooms = new Map<string, Room>();

export const roomStore = {
  get(id: string): Room | undefined {
    return rooms.get(id);
  },
  set(room: Room): void {
    rooms.set(room.roomId, room);
  },
  delete(id: string): void {
    rooms.delete(id);
  },
  clear(): void {
    rooms.clear();
  },
};
