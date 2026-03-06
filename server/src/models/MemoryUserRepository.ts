import { IUserRepository, UserAccount } from "./interface";

export class MemoryUserRepository implements IUserRepository {

  private users: Map<string, UserAccount> = new Map();
  private usernameIndex: Map<string, string> = new Map();

  async createUser(username: string, passwordHash: string): Promise<UserAccount | null> {

    if (this.usernameIndex.has(username)) {
      return null;
    }

    const id = crypto.randomUUID();

    const user: UserAccount = {
      id,
      username,
      passwordHash
    };

    this.users.set(id, user);
    this.usernameIndex.set(username, id);

    return user;
  }

  async findByUsername(username: string): Promise<UserAccount | null> {

    const id = this.usernameIndex.get(username);

    if (!id) return null;

    return this.users.get(id) ?? null;
  }

  async findById(id: string): Promise<UserAccount | null> {
    return this.users.get(id) ?? null;
  }
}