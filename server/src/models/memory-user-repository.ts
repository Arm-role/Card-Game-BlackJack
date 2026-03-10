import { IUserRepository, UserAccount } from "./interface";

export class MemoryUserRepository implements IUserRepository {

  private users: Map<number, UserAccount> = new Map();
  private usernameIndex: Map<string, number> = new Map();
  private nextId = 1;

  async createUser(username: string, passwordHash: string): Promise<UserAccount | undefined> {

    if (this.usernameIndex.has(username)) {
      return undefined;
    }

    const id = this.nextId++;

    const user: UserAccount = {
      id,
      username,
      passwordHash
    };

    this.users.set(id, user);
    this.usernameIndex.set(username, id);

    return user;
  }

  async findByUsername(username: string): Promise<UserAccount | undefined> {

    const id = this.usernameIndex.get(username);

    if (!id) return undefined;

    return this.users.get(id) ?? undefined;
  }

  async findById(id: number): Promise<UserAccount | undefined> {
    return this.users.get(id) ?? undefined;
  }
}