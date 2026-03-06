export interface IUserRepository {
  createUser(username: string, passwordHash: string): Promise<UserAccount | null>;
  findByUsername(username: string): Promise<UserAccount | null>;
  findById(id: string): Promise<UserAccount | null>;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
}

export interface IRoomIdGenerator {
  generate(): string;
}