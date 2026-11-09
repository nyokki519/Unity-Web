import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';

// A dedicated table keeps Mahjong state independent of the existing MIX schema.
export class MahjongStore {
  constructor(path=':memory:') {
    if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(path);
    if(path!==':memory:')chmodSync(path,0o600);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS mahjong_rooms(code TEXT PRIMARY KEY, expires INTEGER NOT NULL, data TEXT NOT NULL);');
    this.saveStmt=this.db.prepare('INSERT INTO mahjong_rooms(code,expires,data) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET expires=excluded.expires,data=excluded.data');
  }
  save(room){this.saveStmt.run(room.code,room.expiresAt,JSON.stringify(room));}
  load(now=Date.now()){this.db.prepare('DELETE FROM mahjong_rooms WHERE expires<=?').run(now);return this.db.prepare('SELECT data FROM mahjong_rooms').all().map(row=>JSON.parse(row.data));}
  remove(code){this.db.prepare('DELETE FROM mahjong_rooms WHERE code=?').run(code);}
  close(){this.db.close();}
}
