import * as bcrypt from "bcrypt";
import { UserAccount, IUserRepository } from "../domain/repositories/i-user-repository.js";

export type { UserAccount, IUserRepository };

// ─── AuthService ──────────────────────────────────────────────────────────────

export class AuthService {
  constructor(private userRepo: IUserRepository) {}

  async register(username: string, password: string): Promise<UserAccount | undefined> {
    const existing = await this.userRepo.findByUsername(username);
    if (existing) return undefined;

    const hash    = await bcrypt.hash(password, 10);
    const account = await this.userRepo.createUser(username, hash);
    return account;
  }

  async login(username: string, password: string): Promise<UserAccount | undefined> {
    const account = await this.userRepo.findByUsername(username);
    if (!account) return undefined;

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) return undefined;

    return account;
  }
}