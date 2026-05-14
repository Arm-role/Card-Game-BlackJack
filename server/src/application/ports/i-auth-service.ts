import { UserAccount } from "../../domain/repositories/i-user-repository.js";

export interface IAuthService {
  register(username: string, password: string): Promise<UserAccount | undefined>;
  login(username: string, password: string): Promise<UserAccount | undefined>;
}
