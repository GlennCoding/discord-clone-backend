import type { UserEntity } from "../types/entities";

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
}
