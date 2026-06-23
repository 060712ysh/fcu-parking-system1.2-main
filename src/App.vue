<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api } from './services/api'
import Navbar from './components/Navbar.vue'
import LoginPanel from './components/LoginPanel.vue'
import FilterPanel from './components/FilterPanel.vue'
import MapContainer from './components/MapContainer.vue'
import ParkingList from './components/ParkingList.vue'
import CarLocation from './components/CarLocation.vue'
import TowHotspots from './components/TowHotspots.vue'
import AdminDashboard from './components/AdminDashboard.vue'

const user = ref(JSON.parse(localStorage.getItem('parkingUser') || 'null'))
const lots = ref([])
const hotspots = ref([])
const reports = ref([])
const favoriteIds = ref([])
const selected = ref(null)
const activeLocation = ref(null)
const transactions = ref([])
const stats = ref(null)
const message = ref('')
const filters = reactive({ vehicleType: 'all', area: 'all', hours: 3, special: [] })
const isAdmin = computed(() => user.value?.role === 'admin')
const sortedLots = computed(() => {
  const favorites = new Set(favoriteIds.value)
  return [...lots.value].sort((a, b) => {
    const aFav = favorites.has(a.id) ? 1 : 0
    const bFav = favorites.has(b.id) ? 1 : 0
    if (aFav !== bFav) return bFav - aFav
    return (a.distance_to_gate || 0) - (b.distance_to_gate || 0)
  })
})

function toast(text) { message.value = text; setTimeout(() => message.value = '', 2800) }
async function loadParking() {
  const data = await api.parking({ ...filters, special: filters.special.join(','), role: user.value?.role || 'visitor' })
  lots.value = data.parkingLots
  selected.value ||= lots.value[0]
}
async function loadUserData() {
  if (!user.value) { favoriteIds.value = []; transactions.value = []; activeLocation.value = null; return }
  activeLocation.value = (await api.carLocation(user.value.id)).carLocation
  transactions.value = (await api.transactions(user.value.id)).transactions
  favoriteIds.value = ((await api.favorites(user.value.id)).favorites || []).map(f => f.id)
  if (isAdmin.value) stats.value = await api.adminStats()
}
async function login(payload) {
  try { const data = await api.login(payload.email, payload.password); user.value = data.user; localStorage.setItem('parkingUser', JSON.stringify(data.user)); await loadParking(); await loadUserData(); toast('登入成功') }
  catch (e) { toast(e.message) }
}
async function register(payload) {
  try { const data = await api.register(payload); user.value = data.user; localStorage.setItem('parkingUser', JSON.stringify(data.user)); await loadParking(); await loadUserData(); toast(data.message || '註冊成功，已登入') }
  catch (e) { toast(e.message) }
}
function logout() { user.value = null; favoriteIds.value = []; localStorage.removeItem('parkingUser'); loadParking() }
async function toggleFavorite(lot) {
  if (!user.value) return toast('請先登入')
  if (favoriteIds.value.includes(lot.id)) {
    await api.removeFavorite(user.value.id, lot.id)
    favoriteIds.value = favoriteIds.value.filter(id => id !== lot.id)
    toast('已取消收藏')
  } else {
    await api.addFavorite(user.value.id, lot.id)
    favoriteIds.value = [...favoriteIds.value, lot.id]
    toast('已加入收藏，卡片會顯示藍色收藏標籤')
  }
  if (isAdmin.value) stats.value = await api.adminStats()
}
async function report(payload) {
  const lot = payload.lot || payload
  await api.report({
    userId: user.value?.id,
    parkingLotId: lot.id,
    reportType: payload.reportType || 'full',
    location: payload.location || lot.name,
    message: payload.message || '使用者回報現場狀況異常'
  })
  await refreshReports()
  await loadParking()
  toast('回報成功，下方「即時回報紀錄」已更新')
}
async function refreshReports() { reports.value = (await api.reports()).reports; hotspots.value = (await api.hotspots()).hotspots }
async function reserve(payload) {
  const lot = payload.lot || payload
  const reserveHours = payload.reserveHours || 1
  try {
    if (!user.value) return toast('請先登入')
    const data = await api.reserve({ userId: user.value.id, parkingLotId: lot.id, arrivalTime: new Date().toISOString(), reserveHours })
    user.value.wallet_balance = data.balanceAfter
    localStorage.setItem('parkingUser', JSON.stringify(user.value))
    await loadParking(); await loadUserData(); toast(`預約成功，已扣款 $${data.amount}，保留 15 分鐘`)
  } catch (e) { toast(e.message) }
}
async function saveCarLocation(form) { if (!user.value) return toast('請先登入'); await api.saveCarLocation(user.value.id, form); await loadUserData(); toast('已儲存停車位置') }
async function clearCarLocation() { await api.clearCarLocation(user.value.id); await loadUserData(); toast('已清除停車位置') }
async function createParking(form) { await api.adminCreateParking(form); await loadParking(); stats.value = await api.adminStats(); toast('新增成功，地圖已加入新停車場') }
async function deleteParking(id) { await api.adminDeleteParking(id); await loadParking(); stats.value = await api.adminStats(); toast('刪除成功') }

watch(filters, loadParking, { deep: true })
onMounted(async () => { await loadParking(); await refreshReports(); await loadUserData() })
</script>

<template>
  <Navbar :user="user" @logout="logout" />
  <main class="page">
    <div v-if="message" class="toast">{{ message }}</div>
    <section class="hero">
      <div><p class="eyebrow">Vue 3 + Express + SQLite</p><h2>即時查詢、收藏、找車、預約與後台管理一次完成</h2><p>以藍色友善校園風設計，地圖燈號、費率估算與拖吊警示都能在同一個頁面快速操作。</p></div>
      <LoginPanel v-if="!user" @login="login" @register="register" />
    </section>
    <FilterPanel v-model="filters" />
    <div class="layout">
      <MapContainer :lots="lots" :selected-id="selected?.id" @select="selected = $event" />
      <ParkingList :lots="sortedLots" :user="user" :favorite-ids="favoriteIds" @favorite="toggleFavorite" @report="report" @reserve="reserve" @select="selected = $event" />
    </div>
    <div class="layout two">
      <TowHotspots :hotspots="hotspots" :reports="reports" />
      <CarLocation :user="user" :lots="lots" :active-location="activeLocation" @save="saveCarLocation" @clear="clearCarLocation" />
    </div>
    <section v-if="user" class="card">
      <h2>虛擬錢包交易紀錄</h2>
      <div v-if="!transactions.length">尚無交易紀錄。</div>
      <div v-for="t in transactions" :key="t.id" class="transaction"><span>{{ t.note }}</span><span>扣款 ${{ t.amount }}</span><span>餘額 ${{ t.balance_after }}</span></div>
    </section>
    <AdminDashboard v-if="isAdmin" :stats="stats" :lots="lots" @create="createParking" @delete="deleteParking" />
  </main>
</template>

<style>
:root { font-family: 'Noto Sans TC', system-ui, sans-serif; color: #14324d; background: #eef6ff; }
* { box-sizing: border-box; } body { margin: 0; } button, input, select, textarea { font: inherit; }
.navbar { display:flex; justify-content:space-between; align-items:center; gap:24px; padding:18px 6vw; color:white; background:linear-gradient(135deg,#0b4f9c,#39a7ff); box-shadow:0 8px 30px #0b4f9c33; }
.navbar h1 { margin:0; font-size:24px; }.eyebrow { margin:0 0 4px; letter-spacing:.12em; text-transform:uppercase; color:#7fd3ff; font-size:12px; font-weight:800; }
.user-box { display:flex; gap:12px; align-items:center; flex-wrap:wrap; } .user-box button, button { border:0; border-radius:14px; padding:10px 14px; background:#e8f3ff; color:#0b4f9c; cursor:pointer; font-weight:700; }
button.primary, .primary { background:#0b75d1; color:white; } button:disabled { opacity:.45; cursor:not-allowed; }
.page { max-width:1180px; margin:auto; padding:28px 18px 60px; }.hero { display:grid; grid-template-columns:1.2fr .8fr; gap:18px; align-items:stretch; }.hero h2 { font-size:34px; margin:8px 0; }
.card { background:white; border:1px solid #dceeff; border-radius:24px; padding:20px; box-shadow:0 12px 30px #2376bd14; }.login-card { display:grid; gap:10px; }
input, select, textarea { width:100%; border:1px solid #c8def2; border-radius:14px; padding:11px 12px; background:#f8fcff; } textarea { min-height:86px; grid-column:1/-1; }
.filter-panel { margin:18px 0; display:grid; grid-template-columns:repeat(4, 1fr); gap:14px; align-items:end; }.filter-panel h2 { grid-column:1/-1; margin:0; }.chips { display:flex; gap:10px; flex-wrap:wrap; grid-column:1/-1; }.chips label { background:#eef7ff; padding:8px 10px; border-radius:999px; }
.layout { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:18px; align-items:stretch; }.layout.two { grid-template-columns:.8fr 1.2fr; }.map-header { display:flex; justify-content:space-between; gap:12px; align-items:center; }.fake-map { position:relative; height:420px; border-radius:22px; overflow:hidden; background:linear-gradient(135deg,#dff2ff,#f8fbff); border:1px solid #cfe6fa; }
.fake-map:before { content:''; position:absolute; inset:18px; border:10px solid #ffffffaa; border-radius:40px; transform:rotate(-8deg); }.campus-core { position:absolute; left:42%; top:42%; width:120px; height:90px; border-radius:20px; display:grid; place-items:center; text-align:center; color:#0b4f9c; font-weight:900; background:white; box-shadow:0 12px 24px #4b92c733; }
.map-pin { position:absolute; z-index:2; color:white; border:3px solid white; box-shadow:0 8px 18px #0002; transform:translate(-50%,-50%); min-width:72px; }.map-pin.green,.light.green { background:#19b36b; }.map-pin.yellow,.light.yellow { background:#f7bd28; }.map-pin.red,.light.red { background:#ee4d5a; }.map-pin.active { transform:translate(-50%,-50%) scale(1.08); outline:4px solid #0b75d155; }
.parking-list { display:grid; gap:14px; height:100%; max-height:none; overflow:auto; padding-right:4px; align-content:start; }.lot-card { cursor:pointer; }.lot-title { display:flex; align-items:center; gap:12px; }.lot-title h3 { margin:0; }.lot-title p { margin:2px 0 0; color:#60758a; }.light { width:16px; height:16px; border-radius:50%; flex:0 0 auto; }.heart { margin-left:auto; border-radius:50%; width:42px; height:42px; font-size:22px; padding:0; }
.lot-meta { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:14px 0; }.lot-meta span, .transaction span, .stats span { background:#f1f8ff; padding:8px; border-radius:12px; text-align:center; }.tags { display:flex; gap:8px; flex-wrap:wrap; }.tags b { background:#dff7ee; color:#087949; padding:6px 10px; border-radius:999px; font-size:13px; }.actions { display:flex; gap:10px; margin-top:14px; }
.warning-card { border-color:#ffd8a8; background:#fffaf2; }.form-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin:12px 0; }.current-car { padding:12px; border-radius:16px; background:#eef7ff; margin-bottom:12px; }.transaction,.admin-row,.stats { display:grid; grid-template-columns:1fr 120px 120px; gap:10px; margin:10px 0; align-items:center; }.stats { grid-template-columns:repeat(2,1fr); }.toast { position:fixed; right:22px; top:86px; z-index:10; background:#0b75d1; color:white; padding:14px 18px; border-radius:14px; box-shadow:0 10px 24px #0003; }

.login-tabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.login-tabs button.active { background:#0b75d1; color:white; }
.reserve-box { display:grid; grid-template-columns:1fr auto; gap:10px; align-items:end; margin-top:12px; padding:12px; border-radius:16px; background:#f6fbff; border:1px solid #dceeff; }
.reserve-box input { margin-top:6px; }
.reserve-box strong { color:#0b4f9c; background:#e8f3ff; border-radius:12px; padding:10px 12px; }
.map-with-detail { display:grid; grid-template-columns:1fr; gap:14px; align-items:stretch; }
.map-detail { border-radius:22px; border:1px solid #dceeff; background:#f8fcff; padding:18px; box-shadow: inset 0 0 0 1px #fff; }
.map-detail h3 { margin:4px 0 8px; font-size:22px; }
.detail-grid { display:grid; grid-template-columns:repeat(4, auto 1fr); gap:8px 14px; margin:14px 0; }
.detail-grid span { color:#60758a; }
.status-text.green { color:#19b36b; } .status-text.yellow { color:#b47a00; } .status-text.red { color:#ee4d5a; }
.note { background:white; border-radius:14px; padding:10px; color:#456; }
.road { position:absolute; z-index:1; color:#6e879d; background:#ffffffcc; border:1px solid #dceeff; border-radius:999px; padding:4px 10px; font-size:13px; font-weight:800; letter-spacing:.08em; }
.road.fuxing { left:8%; top:14%; transform:rotate(-8deg); }
.road.xian { left:7%; bottom:20%; transform:rotate(82deg); }
.road.wenhua { right:9%; top:28%; transform:rotate(88deg); }
.road.henan { right:10%; bottom:18%; transform:rotate(-8deg); }


.favorited-card { border:2px solid #0b75d1; box-shadow:0 14px 34px #0b75d126; }
.favorite-active { background:#0b75d1 !important; color:white !important; box-shadow:0 8px 18px #0b75d144; }
.favorite-ribbon { display:inline-flex; align-items:center; gap:6px; background:#0b75d1; color:white; border-radius:999px; padding:6px 10px; font-size:13px; font-weight:900; }
.report-list { display:grid; gap:10px; margin-top:14px; }
.report-item { background:white; border:1px solid #ffe0b5; border-radius:16px; padding:10px 12px; }
.report-item strong { color:#b45f00; }
.report-location { margin-top:6px; color:#60758a; font-size:14px; background:#fff8ec; border-radius:10px; padding:6px 8px; }
.google-map-bg:before { display:none; }
.admin-map-picker { position:relative; height:300px; border-radius:20px; overflow:hidden; border:1px solid #cfe6fa; cursor:crosshair; margin:12px 0; }
.admin-map-picker .pick-marker { position:absolute; width:24px; height:24px; border-radius:50%; background:#0b75d1; border:4px solid white; box-shadow:0 8px 18px #0003; transform:translate(-50%,-50%); }
.admin-map-picker .hint { position:absolute; left:12px; top:12px; z-index:2; background:#ffffffee; border-radius:999px; padding:7px 11px; font-weight:800; color:#0b4f9c; }
.admin-extra { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:10px 0; }



/* v4：使用第一張 Google Map 大圖，支援縮放；燈號只顯示圓點，點選後才顯示名稱 */

.map-card { height:100%; display:flex; flex-direction:column; }
.map-card .map-with-detail { flex:1; }
.map-card .map-detail { width:100%; }
.map-detail > p:first-of-type { max-width:760px; }

.map-toolbar { display:flex; align-items:center; gap:10px; margin:10px 0 14px; flex-wrap:wrap; }
.map-toolbar span { background:#eef7ff; color:#0b4f9c; border-radius:999px; padding:8px 12px; font-weight:800; }
.real-map-viewport { position:relative; height:560px; border-radius:22px; overflow:hidden; border:1px solid #cfe6fa; background:#eef6ff; cursor:zoom-in; }
.real-map-layer { position:absolute; inset:0; transform-origin:center center; transition:transform .2s ease; }
.map-dot { position:absolute; z-index:3; width:22px; height:22px; min-width:22px; padding:0; border-radius:50%; border:4px solid white; box-shadow:0 8px 18px #0004; transform:translate(-50%,-50%); }
.map-dot.green { background:#19b36b; }
.map-dot.yellow { background:#f7bd28; }
.map-dot.red { background:#ee4d5a; }
.map-dot.active { width:30px; height:30px; min-width:30px; outline:5px solid #0b75d144; z-index:5; }
.map-dot .dot-label { position:absolute; left:50%; top:-42px; transform:translateX(-50%); white-space:nowrap; background:#0b4f9c; color:white; border-radius:12px; padding:7px 10px; font-size:14px; font-weight:900; box-shadow:0 8px 18px #0003; }
.map-dot .dot-label:after { content:''; position:absolute; left:50%; bottom:-7px; transform:translateX(-50%); border-left:7px solid transparent; border-right:7px solid transparent; border-top:7px solid #0b4f9c; }
.google-map-bg { background-image:url('/fcu-google-map.png') !important; background-size:cover !important; background-position:center !important; background-repeat:no-repeat !important; }
.admin-map-picker.google-map-bg { background-size:contain !important; background-position:center !important; background-color:#eef6ff; }
.admin-map-picker { aspect-ratio: 1143 / 751; height:auto !important; min-height:320px; }

@media (max-width: 860px) { .hero,.layout,.layout.two,.filter-panel,.map-with-detail,.reserve-box,.admin-extra { grid-template-columns:1fr; } .lot-meta,.transaction,.admin-row { grid-template-columns:1fr 1fr; } .detail-grid { grid-template-columns:82px 1fr; } }
</style>


<style>
/* v6：回報表單、地圖 detail 對齊、縮放時停車場點固定大小 */
.report-form { margin-top:14px; padding:14px; border-radius:18px; background:#f8fcff; border:1px solid #cfe6fa; display:grid; gap:10px; }
.report-form h4 { margin:0; color:#0b4f9c; }
.form-grid.compact { grid-template-columns:1fr 1fr; margin:0; }
.report-form textarea { min-height:96px; }
.map-card { height:auto !important; display:block !important; }
.map-card .map-with-detail { flex:0 0 auto !important; display:flex !important; flex-direction:column !important; gap:14px !important; align-items:stretch !important; }
.real-map-viewport { flex:0 0 auto; }
.map-detail { min-height:0 !important; height:auto !important; }
.map-dot { transform:translate(-50%,-50%) scale(calc(1 / var(--zoom, 1))) !important; transform-origin:center center !important; }
.map-dot.active { width:22px !important; height:22px !important; min-width:22px !important; outline:5px solid #0b75d144; }
.map-dot .dot-label { transform:translateX(-50%) scale(var(--zoom, 1)); transform-origin:bottom center; }
@media (max-width: 860px) { .form-grid.compact { grid-template-columns:1fr; } }
</style>

<style>
/* v8：右側停車場清單與左側即時地圖燈號頂部對齊、與 Parking Detail 底部對齊，清單可獨立上下滑動 */
.layout:first-of-type {
  align-items: stretch !important;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 1fr);
}

.layout:first-of-type > .map-card {
  height: 100%;
}

.layout:first-of-type > .parking-list {
  margin-top: 0 !important;
  height: 100%;
  max-height: 980px;
  min-height: 980px;
  overflow-y: auto !important;
  overflow-x: hidden;
  padding-right: 8px;
  scroll-behavior: smooth;
  align-content: start;
  border-radius: 22px;
  align-self: stretch;
}

.layout:first-of-type > .parking-list::-webkit-scrollbar {
  width: 10px;
}
.layout:first-of-type > .parking-list::-webkit-scrollbar-track {
  background: #eaf5ff;
  border-radius: 999px;
}
.layout:first-of-type > .parking-list::-webkit-scrollbar-thumb {
  background: #9bcaf2;
  border-radius: 999px;
  border: 2px solid #eaf5ff;
}
.layout:first-of-type > .parking-list::-webkit-scrollbar-thumb:hover {
  background: #5fa8e8;
}

@media (max-width: 1100px) {
  .layout:first-of-type {
    grid-template-columns: 1fr;
  }
  .layout:first-of-type > .parking-list {
    min-height: 0;
    max-height: 70vh;
    height: auto;
  }
}
</style>


<style>
/* v10：下方兩區塊底部對齊，回報區塊改為內部滾動，避免找尋愛車記錄下方被撐出大量空白 */
.layout.two {
  align-items: stretch !important;
  grid-template-columns: .8fr 1.2fr;
}

.layout.two > .card {
  height: 420px !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.layout.two > .card h2,
.layout.two > .card h3,
.layout.two > .card p,
.layout.two > .card ul {
  flex: 0 0 auto;
}

.layout.two > .warning-card .report-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  align-content: start;
}

.layout.two > .warning-card .report-list::-webkit-scrollbar {
  width: 9px;
}
.layout.two > .warning-card .report-list::-webkit-scrollbar-track {
  background: #fff2df;
  border-radius: 999px;
}
.layout.two > .warning-card .report-list::-webkit-scrollbar-thumb {
  background: #ffc46e;
  border-radius: 999px;
  border: 2px solid #fff2df;
}

.layout.two > .card:not(.warning-card) .form-grid {
  flex: 0 0 auto;
}

.sqlite-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  background: #e8f3ff;
  color: #0b4f9c;
  border: 1px solid #c8def2;
  border-radius: 999px;
  padding: 7px 11px;
  font-size: 13px;
  font-weight: 900;
}

@media (max-width: 860px) {
  .layout.two {
    grid-template-columns: 1fr;
  }
  .layout.two > .card {
    height: auto !important;
    max-height: none;
    overflow: visible !important;
  }
  .layout.two > .warning-card .report-list {
    max-height: 300px;
  }
}
</style>

