import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
export class RoomStore {
  constructor(path) {
    if (path!==':memory:') mkdirSync(dirname(path),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(path);
    if (path!==':memory:') chmodSync(path,0o600);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, expires INTEGER NOT NULL, data TEXT NOT NULL);');
    this.saveStmt=this.db.prepare('INSERT INTO rooms(code,expires,data) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET expires=excluded.expires,data=excluded.data');
  }
  save(room) {this.saveStmt.run(room.code,room.expiresAt,JSON.stringify(room));}
  load() {const deleted=this.db.prepare('DELETE FROM rooms WHERE expires < ?').run(Date.now());if(deleted.changes)this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');return this.db.prepare('SELECT data FROM rooms').all().map(r=>JSON.parse(r.data));}
  remove(code) {this.db.prepare('DELETE FROM rooms WHERE code=?').run(code);this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');}
  close() {this.db.close();}
}
