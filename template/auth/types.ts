import type { Command, Query } from "seiro";

export type User = {
  id: number;
  email: string;
  createdAt: string;
};

export type AuthResult = {
  token: string;
  user: User;
};

export type AuthCommands = {
  "auth.register": Command<{ email: string; password: string }, AuthResult>;
  "auth.login": Command<{ email: string; password: string }, AuthResult>;
};

export type AuthQueries = {
  "auth.profile": Query<void, User>;
};

export type AuthEvents = Record<string, never>;
