# 逢甲大學友善校園 - 停車系統

本專案符合課程要求的三層架構：

```txt
/project
  /server  ← Express API only
  /client  ← Vue 3 + Vite
```

## 技術棧

- 前端：HTML、CSS、JavaScript、Vue 3、Vite
- 後端：Node.js、Express
- 資料庫：SQLite，資料庫檔案為 `server/data/parking.db`

> 補充：SQLite 的副檔名可以是 `.db`、`.sqlite`、`.sqlite3`，本專案為了讓老師一眼看出資料庫檔案，已改成常見的 `.db`。

## 執行方式

### 1. 啟動後端

```bash
cd server
npm install
npm run dev
```

後端 API 位置：

```txt
http://localhost:3000/api/health
```

SQLite 會自動建立於：

```txt
server/data/parking.db
```

### 2. 啟動前端

另開一個 Terminal：

```bash
cd client
npm install
npm run dev
```

前端網址：

```txt
http://localhost:5173
```

## 測試帳號

```txt
學生：student@fcu.edu.tw / 123456
管理員：admin@fcu.edu.tw / admin123
```

## 本版修正

- 專案架構改成 `/server` 與 `/client`，更符合課程指定格式。
- SQLite 資料庫檔案改成 `parking.db`。
- 「逢甲拖吊與即時回報區塊」改為內部上下滑動。
- 「找尋愛車記錄」不會因為左邊回報太多而被撐出大量空白。
- 下方兩個區塊底部維持對齊。



## SQLite 與資料表建立方式

本專案使用 SQLite，實際資料庫檔案會自動建立在：

```text
server/data/parking.db
```

目前已經不使用獨立的 `schema.sql` 檔案。所有建立資料表的 SQL 都已經整合到：

```text
server/db.js
```

後端第一次啟動時，`db.js` 會自動執行 `CREATE TABLE IF NOT EXISTS`，建立 Users、ParkingLots、Reports、Favorites、CarLocations、Reservations、Transactions 等資料表。


## 專案架構（整合版）

本專案將 Vue + Vite 前端放在專案根目錄，Express API 放在 `server/` 資料夾中，SQLite 資料庫會在後端啟動時自動建立於 `server/data/parking.db`。

```text
fcu-parking-system/
  index.html
  package.json
  vite.config.js
  src/                 # Vue 前端
  public/              # 靜態圖片
  server/              # Express API only
    index.js
    db.js              # SQLite 建表與資料庫連線
    data/parking.db    # 執行後自動產生，可刪除重建
```

## 執行方式

第一次下載後，在專案根目錄安裝套件：

```bash
npm install
```

啟動後端 API：

```bash
npm run server
```

另開一個 Terminal，啟動前端：

```bash
npm run dev
```

後端測試網址：`http://localhost:3000/api/health`

前端網址：`http://localhost:5173`
