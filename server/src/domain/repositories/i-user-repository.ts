export interface UserAccount {
  id:           number;
  username:     string;
  passwordHash: string;
}

export interface IUserRepository {
  findByUsername(username: string): Promise<UserAccount | undefined>;
  createUser(username: string, passwordHash: string): Promise<UserAccount>;
}
