export type Cmd = {
    cmd: string;
    cid: string;
    data: object;
    ack?: boolean;
};
export type CmdError = {
    cid: string;
    err: string;
};
export type CmdResult = {
    cid: string;
    result: unknown;
};
export type QueryMsg = {
    q: string;
    id: number;
    params?: object;
};
export type Row = {
    id: number;
    row: object;
};
export type End = {
    id: number;
};
export type Event = {
    ev: string;
    data: object;
    id?: string;
};
export type Sub = {
    sub: string;
    since?: string;
};
export type Unsub = {
    unsub: string;
};
export declare function isCmd(msg: unknown): msg is Cmd;
export declare function isQuery(msg: unknown): msg is QueryMsg;
export declare function isCmdError(msg: unknown): msg is CmdError;
export declare function isCmdResult(msg: unknown): msg is CmdResult;
export declare function isRow(msg: unknown): msg is Row;
export declare function isEnd(msg: unknown): msg is End;
export declare function isEvent(msg: unknown): msg is Event;
export declare function isSub(msg: unknown): msg is Sub;
export declare function isUnsub(msg: unknown): msg is Unsub;
export declare function encode(msg: object): string;
export declare function decode(line: string): unknown;
export declare function cid(): string;
//# sourceMappingURL=protocol.d.ts.map