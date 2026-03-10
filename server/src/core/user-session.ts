import { v4 as uuid } from "uuid";
import { WebSocket } from "ws";

export class UserSession {
	private sessionId: string;
	private userId: number;
	private username?: string;

	private ws: WebSocket;

	constructor(ws: WebSocket) {
		this.sessionId = uuid();
		this.ws = ws;
	}

	public bindUser(accountId: number, username: string) {
		this.userId = accountId;
		this.username = username;
	}

	public isAuthenticated(): boolean {
		return this.userId !== undefined;
	}

	public send(message: any) {
		this.ws.send(JSON.stringify(message));
	}

	public getSessionId() {
		return this.sessionId;
	}

	public getUserId() {
		return this.userId;
	}

	public getUsername() {
		return this.username;
	}

}