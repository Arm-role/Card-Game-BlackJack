import * as bcrypt from "bcrypt";
import { IUserRepository, UserAccount } from "../models/interface";

export class AuthService {

  constructor(private userRepo: IUserRepository) {}

  async register(username: string, password: string): Promise<UserAccount | null> {

    const existing = await this.userRepo.findByUsername(username);
    if (existing) return null;

    const hash = await bcrypt.hash(password, 10);

    const account = await this.userRepo.createUser(username, hash);

    return account;
  }

  async login(username: string, password: string): Promise<UserAccount | null> {

    const account = await this.userRepo.findByUsername(username);

    if (!account) return null;

    const valid = await bcrypt.compare(password, account.passwordHash);

    if (!valid) return null;

    return account;
  }
}