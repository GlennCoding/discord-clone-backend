import type { UserEntity } from "../types/entities";

export type UserRepository = {
  findById(id: string): Promise<UserEntity | null>;
}
