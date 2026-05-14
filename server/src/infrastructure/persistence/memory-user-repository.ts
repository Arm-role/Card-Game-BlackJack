import { IUserRepository, UserAccount } from "../../domain/repositories/i-user-repository.js";

export class MemoryUserRepository implements IUserRepository {
  private users: UserAccount[] = [];
  private nextId = 1;

  async findByUsername(username: string): Promise<UserAccount | undefined> {
    return this.users.find((u) => u.username === username);
  }

  async createUser(username: string, passwordHash: string): Promise<UserAccount> {
    const account: UserAccount = { id: this.nextId++, username, passwordHash };
    this.users.push(account);
    return account;
  }
}
