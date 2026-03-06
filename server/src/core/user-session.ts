import { v4 as uuid } from "uuid";
import { WebSocket } from "ws";
import { MessageDispatcher } from "./message-dispatcher";

export class UserSession {
    private sessionId: string;
    private accountId?: string;
    private username?: string;
    private displayName?: string;

    private ws: WebSocket;
    private dispatcher = new MessageDispatcher();

    constructor(ws: WebSocket) {
        this.sessionId = uuid();
        this.ws = ws;
    }

    public bindAccount(accountId: string, username: string) {
        this.accountId = accountId;
        this.username = username;
        this.displayName = username;
    }

    public isAuthenticated(): boolean {
        return this.accountId !== undefined;
    }

    public send(message: any) {
        this.ws.send(JSON.stringify(message));
    }

    public getSessionId() {
        return this.sessionId;
    }

    public getAccountId() {
        return this.accountId;
    }

    public getDisplayName() {
        return this.displayName;
    }
}