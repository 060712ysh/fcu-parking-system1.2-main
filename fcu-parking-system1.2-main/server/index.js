import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDb, all, get, run } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
app.use(cors())
app.use(express.json())

function asyncHandler(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next) }
function trafficLight(lot) {
  const ratio = lot.total_spaces ? lot.available_spaces / lot.total_spaces : 0
  if (ratio > 0.3) return 'green'
  if (ratio >= 0.1) return 'yellow'
  return 'red'
}
function decorate(lots, hours = 1) {
  const minFee = Math.min(...lots.map(l => Math.ceil(hours * l.hourly_rate)))
  const minDistance = Math.min(...lots.map(l => l.distance_to_gate))
  return lots.map(l => ({ ...l, light: trafficLight(l), estimated_fee: Math.ceil(hours * l.hourly_rate), tags: [Math.ceil(hours * l.hourly_rate) === minFee ? '最便宜' : null, l.distance_to_gate === minDistance ? '離校門最近' : null].filter(Boolean) }))
}

app.get('/api/health', (req, res) => res.json({ ok: true }))


app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { name, email, password, role = 'visitor' } = req.body
  const cleanName = String(name || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '').trim()
  const cleanRole = ['student', 'visitor'].includes(role) ? role : 'visitor'
  if (!cleanName || !cleanEmail || !cleanPassword) return res.status(400).json({ error: '姓名、Email、密碼都必填' })
  if (!cleanEmail.includes('@')) return res.status(400).json({ error: 'Email 格式不正確' })
  const existed = await get('SELECT id FROM Users WHERE email=?', [cleanEmail])
  if (existed) return res.status(409).json({ error: '此 Email 已註冊，請直接登入' })
  const wallet = cleanRole === 'student' ? 800 : 500
  const result = await run('INSERT INTO Users (name,email,password,role,wallet_balance) VALUES (?,?,?,?,?)', [cleanName, cleanEmail, cleanPassword, cleanRole, wallet])
  const user = await get('SELECT id,name,email,role,wallet_balance FROM Users WHERE id=?', [result.id])
  res.status(201).json({ user, message: '註冊成功，已自動登入' })
}))

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await get('SELECT id,name,email,role,wallet_balance FROM Users WHERE email=? AND password=?', [email, password])
  if (!user) return res.status(401).json({ error: '帳號或密碼錯誤' })
  res.json({ user })
}))

app.get('/api/parking', asyncHandler(async (req, res) => {
  const { vehicleType = 'all', area = 'all', special = '', hours = 1, role = 'visitor' } = req.query
  const where = []
  const params = []
  if (vehicleType !== 'all') { where.push('(vehicle_type=? OR vehicle_type="both")'); params.push(vehicleType) }
  if (area !== 'all') { where.push('campus_area=?'); params.push(area) }
  if (role !== 'student' && role !== 'admin') where.push('is_student_only=0')
  if (special.includes('disabled')) where.push('disabled_spaces > 0')
  if (special.includes('parentChild')) where.push('parent_child_spaces > 0')
  if (special.includes('ev')) where.push('ev_spaces > 0')
  const sql = `SELECT * FROM ParkingLots ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY distance_to_gate ASC`
  const lots = await all(sql, params)
  res.json({ parkingLots: decorate(lots, Number(hours) || 1) })
}))

app.post('/api/reports', asyncHandler(async (req, res) => {
  const { userId = null, parkingLotId = null, reportType, location = '', message = '' } = req.body
  if (!reportType) return res.status(400).json({ error: '缺少 reportType' })
  const result = await run('INSERT INTO Reports (user_id,parking_lot_id,report_type,location,message) VALUES (?,?,?,?,?)', [userId, parkingLotId, reportType, location, message])
  if (parkingLotId) await run('UPDATE ParkingLots SET report_count=report_count+1, updated_at=CURRENT_TIMESTAMP WHERE id=?', [parkingLotId])
  res.json({ id: result.id, message: '回報成功' })
}))


app.get('/api/reports', asyncHandler(async (req, res) => {
  const rows = await all(`SELECT r.*, p.name AS parking_lot_name FROM Reports r LEFT JOIN ParkingLots p ON p.id=r.parking_lot_id ORDER BY r.created_at DESC LIMIT 30`)
  res.json({ reports: rows })
}))

app.get('/api/tow-hotspots', asyncHandler(async (req, res) => {
  const rows = await all(`SELECT location, COUNT(*) AS count, MAX(message) AS message FROM Reports WHERE report_type IN ('tow','illegal') AND date(created_at)=date('now','localtime') GROUP BY location ORDER BY count DESC`)
  res.json({ hotspots: rows })
}))

app.get('/api/users/:userId/favorites', asyncHandler(async (req, res) => {
  const rows = await all('SELECT p.* FROM Favorites f JOIN ParkingLots p ON p.id=f.parking_lot_id WHERE f.user_id=?', [req.params.userId])
  res.json({ favorites: rows.map(r => ({ ...r, light: trafficLight(r) })) })
}))
app.post('/api/users/:userId/favorites', asyncHandler(async (req, res) => {
  await run('INSERT OR IGNORE INTO Favorites (user_id,parking_lot_id) VALUES (?,?)', [req.params.userId, req.body.parkingLotId])
  res.json({ message: '已加入收藏' })
}))
app.delete('/api/users/:userId/favorites/:parkingLotId', asyncHandler(async (req, res) => {
  await run('DELETE FROM Favorites WHERE user_id=? AND parking_lot_id=?', [req.params.userId, req.params.parkingLotId])
  res.json({ message: '已移除收藏' })
}))

app.get('/api/users/:userId/car-location', asyncHandler(async (req, res) => {
  const row = await get('SELECT * FROM CarLocations WHERE user_id=? AND is_active=1 ORDER BY created_at DESC LIMIT 1', [req.params.userId])
  res.json({ carLocation: row || null })
}))
app.post('/api/users/:userId/car-location', asyncHandler(async (req, res) => {
  await run('UPDATE CarLocations SET is_active=0 WHERE user_id=?', [req.params.userId])
  const { parkingLotId = null, parkingLotName, floor = '', spaceNumber = '', memo = '', imageUrl = '' } = req.body
  const result = await run('INSERT INTO CarLocations (user_id,parking_lot_id,parking_lot_name,floor,space_number,memo,image_url) VALUES (?,?,?,?,?,?,?)', [req.params.userId, parkingLotId, parkingLotName, floor, spaceNumber, memo, imageUrl])
  res.json({ id: result.id, message: '已記錄停車位置' })
}))
app.delete('/api/users/:userId/car-location', asyncHandler(async (req, res) => {
  await run('UPDATE CarLocations SET is_active=0 WHERE user_id=?', [req.params.userId])
  res.json({ message: '已清除記錄' })
}))

app.post('/api/reservations', asyncHandler(async (req, res) => {
  const { userId, parkingLotId, arrivalTime, reserveHours, estimatedHours = 1 } = req.body
  const user = await get('SELECT * FROM Users WHERE id=?', [userId])
  const lot = await get('SELECT * FROM ParkingLots WHERE id=?', [parkingLotId])
  if (!user || !lot) return res.status(404).json({ error: '找不到用戶或停車場' })
  if (!lot.is_partner) return res.status(400).json({ error: '此停車場尚未開放預約' })
  const hours = Number(reserveHours ?? estimatedHours)
  if (!Number.isFinite(hours) || hours <= 0) return res.status(400).json({ error: '預約時數必須大於 0' })
  const amount = Math.ceil(hours * lot.hourly_rate)
  if (user.wallet_balance < amount) return res.status(400).json({ error: '虛擬錢包餘額不足' })
  const holdUntil = new Date(new Date(arrivalTime).getTime() + 15 * 60 * 1000).toISOString()
  const result = await run('INSERT INTO Reservations (user_id,parking_lot_id,arrival_time,hold_until,estimated_hours,amount) VALUES (?,?,?,?,?,?)', [userId, parkingLotId, arrivalTime, holdUntil, hours, amount])
  const newBalance = user.wallet_balance - amount
  await run('UPDATE Users SET wallet_balance=? WHERE id=?', [newBalance, userId])
  await run('UPDATE ParkingLots SET available_spaces=MAX(available_spaces-1,0) WHERE id=?', [parkingLotId])
  await run('INSERT INTO Transactions (user_id,reservation_id,type,amount,balance_after,note) VALUES (?,?,?,?,?,?)', [userId, result.id, 'reserve', amount, newBalance, `預約 ${lot.name} ${hours} 小時`])
  res.json({ reservationId: result.id, holdUntil, amount, balanceAfter: newBalance, message: '預約成功，車位保留 15 分鐘' })
}))
app.get('/api/users/:userId/transactions', asyncHandler(async (req, res) => {
  const rows = await all('SELECT * FROM Transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 20', [req.params.userId])
  res.json({ transactions: rows })
}))

app.get('/api/admin/stats', asyncHandler(async (req, res) => {
  const users = await get('SELECT COUNT(*) AS count FROM Users')
  const popular = await all('SELECT p.name, COUNT(f.id) AS favorites FROM ParkingLots p LEFT JOIN Favorites f ON p.id=f.parking_lot_id GROUP BY p.id ORDER BY favorites DESC, p.report_count DESC LIMIT 5')
  const reports = await get('SELECT COUNT(*) AS count FROM Reports')
  res.json({ totalUsers: users.count, totalReports: reports.count, popular })
}))
app.post('/api/admin/parking', asyncHandler(async (req, res) => {
  const p = req.body
  const result = await run(`INSERT INTO ParkingLots (name,campus_area,address,latitude,longitude,distance_to_gate,vehicle_type,total_spaces,available_spaces,disabled_spaces,parent_child_spaces,ev_spaces,hourly_rate,is_partner,is_student_only,status_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [p.name,p.campus_area,p.address,p.latitude,p.longitude,p.distance_to_gate,p.vehicle_type,p.total_spaces,p.available_spaces,p.disabled_spaces||0,p.parent_child_spaces||0,p.ev_spaces||0,p.hourly_rate,p.is_partner?1:0,p.is_student_only?1:0,p.status_note||''])
  res.json({ id: result.id, message: '新增成功' })
}))
app.put('/api/admin/parking/:id', asyncHandler(async (req, res) => {
  const p = req.body
  await run('UPDATE ParkingLots SET name=?, total_spaces=?, available_spaces=?, hourly_rate=?, status_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [p.name, p.total_spaces, p.available_spaces, p.hourly_rate, p.status_note || '', req.params.id])
  res.json({ message: '更新成功' })
}))
app.delete('/api/admin/parking/:id', asyncHandler(async (req, res) => {
  await run('DELETE FROM ParkingLots WHERE id=?', [req.params.id])
  res.json({ message: '刪除成功' })
}))

app.use(express.static(path.join(__dirname, '../dist')))

// Azure App Service / production SPA fallback: 非 API 路由都回傳 Vue 打包後的 index.html
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message }) })
initDb().then(() => app.listen(PORT, () => console.log(`API server http://localhost:${PORT}`)))
