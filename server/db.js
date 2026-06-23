import fs from 'node:fs'
import path from 'node:path'
import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'parking.db')
fs.mkdirSync(path.dirname(dbPath), { recursive: true })
sqlite3.verbose()
export const db = new sqlite3.Database(dbPath)

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err)
      else resolve({ id: this.lastID, changes: this.changes })
    })
  })
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))))
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))))
}

const schemaSql = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'visitor' CHECK(role IN ('student','visitor','admin')),wallet_balance INTEGER NOT NULL DEFAULT 500,created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS ParkingLots (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,campus_area TEXT NOT NULL CHECK(campus_area IN ('校內頂級憑證格','校外一般停車場')),address TEXT NOT NULL,latitude REAL NOT NULL,longitude REAL NOT NULL,distance_to_gate INTEGER NOT NULL,vehicle_type TEXT NOT NULL CHECK(vehicle_type IN ('car','motorcycle','both')),total_spaces INTEGER NOT NULL,available_spaces INTEGER NOT NULL,disabled_spaces INTEGER NOT NULL DEFAULT 0,parent_child_spaces INTEGER NOT NULL DEFAULT 0,ev_spaces INTEGER NOT NULL DEFAULT 0,hourly_rate INTEGER NOT NULL,is_partner INTEGER NOT NULL DEFAULT 0,is_student_only INTEGER NOT NULL DEFAULT 0,report_count INTEGER NOT NULL DEFAULT 0,status_note TEXT DEFAULT '',updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS Favorites (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,parking_lot_id INTEGER NOT NULL,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id, parking_lot_id),FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,FOREIGN KEY(parking_lot_id) REFERENCES ParkingLots(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS CarLocations (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,parking_lot_id INTEGER,parking_lot_name TEXT NOT NULL,floor TEXT,space_number TEXT,memo TEXT,image_url TEXT,is_active INTEGER NOT NULL DEFAULT 1,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,FOREIGN KEY(parking_lot_id) REFERENCES ParkingLots(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS Reservations (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,parking_lot_id INTEGER NOT NULL,arrival_time DATETIME NOT NULL,hold_until DATETIME NOT NULL,status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','completed','cancelled')),estimated_hours REAL NOT NULL DEFAULT 1,amount INTEGER NOT NULL DEFAULT 0,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,FOREIGN KEY(parking_lot_id) REFERENCES ParkingLots(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS Transactions (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,reservation_id INTEGER,type TEXT NOT NULL CHECK(type IN ('reserve','exit','topup')),amount INTEGER NOT NULL,balance_after INTEGER NOT NULL,note TEXT,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,FOREIGN KEY(reservation_id) REFERENCES Reservations(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS Reports (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,parking_lot_id INTEGER,report_type TEXT NOT NULL CHECK(report_type IN ('full','broken','tow','illegal')),location TEXT,message TEXT,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE SET NULL,FOREIGN KEY(parking_lot_id) REFERENCES ParkingLots(id) ON DELETE SET NULL);
`

export async function initDb() {
  await new Promise((resolve, reject) => {
    db.exec(schemaSql, (err) => (err ? reject(err) : resolve()))
  })
  const seeded = await get('SELECT COUNT(*) AS count FROM ParkingLots')
  await applyMigrations()
  if (seeded.count > 0) return
  await seed()
  await applyMigrations()
}

async function applyMigrations() {
  await run("UPDATE ParkingLots SET is_partner=1 WHERE name='西安街公有停車場'")
}

async function seed() {
  await run(`INSERT INTO Users (name,email,password,role,wallet_balance) VALUES
    ('管理員','admin@fcu.edu.tw','admin123','admin',2000),
    ('逢甲學生','student@fcu.edu.tw','123456','student',800),
    ('一般訪客','visitor@example.com','123456','visitor',500)`)
  const lots = [
    ['福星校區機車棚','校內頂級憑證格','台中市西屯區福星路',24.1782,120.6467,120,'motorcycle',300,168,6,0,12,10,1,1,'師生登入後可查看'],
    ['主校區地下停車場','校內頂級憑證格','台中市西屯區文華路100號',24.1791,120.6492,80,'car',120,28,4,6,10,40,1,0,'靠近校門'],
    ['逢甲商圈停車場A','校外一般停車場','福星路與西安街口',24.1805,120.6458,260,'both',180,15,2,4,6,35,1,0,'尖峰時段易滿'],
    ['西安街公有停車場','校外一般停車場','台中市西屯區西安街',24.1814,120.6442,450,'car',90,47,2,2,4,25,1,0,'價格較低，可線上預約'],
    ['河南路立體停車場','校外一般停車場','河南路二段',24.1766,120.6508,520,'both',240,95,4,8,8,30,1,0,'車位穩定']
  ]
  for (const lot of lots) {
    await run(`INSERT INTO ParkingLots (name,campus_area,address,latitude,longitude,distance_to_gate,vehicle_type,total_spaces,available_spaces,disabled_spaces,parent_child_spaces,ev_spaces,hourly_rate,is_partner,is_student_only,status_note)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, lot)
  }
  await run(`INSERT INTO Reports (parking_lot_id, report_type, location, message) VALUES
    (3,'tow','西安街','今日有拖吊回報，請勿臨停紅線'),
    (3,'illegal','福星路','校門口周邊違停熱點'),
    (2,'broken','主校區地下停車場','B1 充電樁疑似故障')`)
}
