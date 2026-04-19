
export interface IUserRepository {
  createUser(username: string, passwordHash: string): Promise<UserAccount | undefined>;
  findByUsername(username: string): Promise<UserAccount | undefined>;
  findById(id: number): Promise<UserAccount | undefined>;
}

export interface UserAccount {
  id: number;
  username: string;
  passwordHash: string;
}

export interface IRoomIdGenerator {
  generate(): number;
}