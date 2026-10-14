export class GameError extends Error {constructor(code){super(code);this.code=code;}}
export const fail=code=>{throw new GameError(code);};
