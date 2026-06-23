<script setup>
import { computed, reactive } from 'vue'
const props = defineProps({ stats: Object, lots: Array })
defineEmits(['create','update','delete'])
const form = reactive({
  name:'新停車場', campus_area:'校外一般停車場', address:'逢甲周邊',
  latitude:24.1790, longitude:120.6480, distance_to_gate:300, vehicle_type:'car',
  total_spaces:50, available_spaces:20, hourly_rate:30, is_partner:true, is_student_only:false, status_note:'管理員新增'
})
const markerStyle = computed(() => {
  const latMin = 24.1730, latMax = 24.1844
  const lngMin = 120.6410, lngMax = 120.6570
  const left = Math.min(96, Math.max(4, ((Number(form.longitude) - lngMin) / (lngMax - lngMin)) * 100))
  const top = Math.min(96, Math.max(4, (1 - ((Number(form.latitude) - latMin) / (latMax - latMin))) * 100))
  return { left: `${left}%`, top: `${top}%` }
})
function pickLocation(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  const latMin = 24.1730, latMax = 24.1844
  const lngMin = 120.6410, lngMax = 120.6570
  form.longitude = +(lngMin + x * (lngMax - lngMin)).toFixed(6)
  form.latitude = +(latMax - y * (latMax - latMin)).toFixed(6)
  form.distance_to_gate = Math.max(50, Math.round(Math.hypot((form.latitude - 24.1791) * 111000, (form.longitude - 120.6492) * 101000)))
}
</script>
<template>
  <section class="card admin-card">
    <h2>管理員控制台</h2>
    <div class="stats"><span>總註冊人數：{{ stats?.totalUsers || 0 }}</span><span>總回報數：{{ stats?.totalReports || 0 }}</span></div>
    <h3>熱門停車場排行</h3>
    <ol><li v-for="p in stats?.popular || []" :key="p.name">{{ p.name }} 收藏 {{ p.favorites }}</li></ol>

    <h3>新增停車場</h3>
    <p>可以直接點下方 Google Map 圖片選擇停車場位置，系統會自動填入經緯度與距校門距離。</p>
    <div class="admin-map-picker google-map-bg" @click="pickLocation">
      <span class="hint">點擊地圖選擇新增位置</span>
      <span class="pick-marker" :style="markerStyle"></span>
    </div>
    <div class="form-grid">
      <input v-model="form.name" placeholder="停車場名稱" />
      <input v-model="form.address" placeholder="地址或路名" />
      <select v-model="form.campus_area"><option>校內頂級憑證格</option><option>校外一般停車場</option></select>
      <select v-model="form.vehicle_type"><option value="car">汽車格</option><option value="motorcycle">機車格</option><option value="both">汽機車皆可</option></select>
      <input v-model.number="form.total_spaces" type="number" placeholder="總格數" />
      <input v-model.number="form.available_spaces" type="number" placeholder="剩餘格數" />
      <input v-model.number="form.hourly_rate" type="number" placeholder="每小時費率" />
      <input v-model.number="form.distance_to_gate" type="number" placeholder="距校門公尺" />
      <input v-model.number="form.latitude" type="number" step="0.000001" placeholder="緯度" />
      <input v-model.number="form.longitude" type="number" step="0.000001" placeholder="經度" />
    </div>
    <div class="admin-extra">
      <label><input type="checkbox" v-model="form.is_partner" /> 可預約</label>
      <label><input type="checkbox" v-model="form.is_student_only" /> 師生限定</label>
      <input v-model="form.status_note" placeholder="備註，例如 靠近校門" />
    </div>
    <button class="primary" @click="$emit('create', { ...form })">新增</button>

    <h3>快速管理</h3>
    <div v-for="lot in lots" :key="lot.id" class="admin-row"><span>{{ lot.name }}</span><span>${{ lot.hourly_rate }}/hr</span><button @click="$emit('delete', lot.id)">刪除</button></div>
  </section>
</template>
