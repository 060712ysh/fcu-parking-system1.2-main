<script setup>
import { computed, ref } from 'vue'

const props = defineProps({ lots: Array, selectedId: Number })
defineEmits(['select'])

const zoom = ref(1)
const selectedLot = computed(() => props.lots?.find(l => l.id === props.selectedId) || props.lots?.[0])

function pos(lot) {
  // 對應第一張 Google Map 大圖的逢甲周邊範圍
  const latMin = 24.1730, latMax = 24.1844
  const lngMin = 120.6410, lngMax = 120.6570
  const left = Math.min(96, Math.max(4, ((Number(lot.longitude) - lngMin) / (lngMax - lngMin)) * 100))
  const top = Math.min(96, Math.max(4, (1 - ((Number(lot.latitude) - latMin) / (latMax - latMin))) * 100))
  return { left: `${left}%`, top: `${top}%` }
}
function zoomIn() { zoom.value = Math.min(2.2, +(zoom.value + 0.2).toFixed(1)) }
function zoomOut() { zoom.value = Math.max(1, +(zoom.value - 0.2).toFixed(1)) }
function resetZoom() { zoom.value = 1 }
function wheelZoom(event) {
  event.preventDefault()
  if (event.deltaY < 0) zoomIn()
  else zoomOut()
}
</script>

<template>
  <section class="card map-card">
    <div class="map-header">
      <h2>即時地圖燈號</h2>
      <span>綠：空位多｜黃：接近滿｜紅：滿車</span>
    </div>

    <div class="map-toolbar">
      <button @click="zoomOut">－</button>
      <span>地圖縮放 {{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomIn">＋</button>
      <button @click="resetZoom">重設</button>
    </div>

    <div class="map-with-detail">
      <div class="real-map-viewport" @wheel="wheelZoom">
        <div class="real-map-layer google-map-bg" :style="{ transform: `scale(${zoom})` }">
          <button
            v-for="lot in lots"
            :key="lot.id"
            class="map-dot"
            :class="[lot.light, { active: selectedId === lot.id }]"
            :style="{ ...pos(lot), '--zoom': zoom }"
            :title="lot.name"
            @click.stop="$emit('select', lot)"
          >
            <span v-if="selectedId === lot.id" class="dot-label">{{ lot.name }}</span>
          </button>
        </div>
      </div>

      <aside class="map-detail" v-if="selectedLot">
        <p class="eyebrow">Parking Detail</p>
        <h3>{{ selectedLot.name }}</h3>
        <p>{{ selectedLot.address }}</p>
        <div class="detail-grid">
          <span>燈號</span><b :class="['status-text', selectedLot.light]">{{ selectedLot.light === 'green' ? '空位多' : selectedLot.light === 'yellow' ? '接近滿' : '滿車' }}</b>
          <span>剩餘</span><b>{{ selectedLot.available_spaces }}/{{ selectedLot.total_spaces }}</b>
          <span>費率</span><b>${{ selectedLot.hourly_rate }}/小時</b>
          <span>距校門</span><b>{{ selectedLot.distance_to_gate }}m</b>
          <span>車種</span><b>{{ selectedLot.vehicle_type === 'both' ? '汽車/機車' : selectedLot.vehicle_type === 'car' ? '汽車' : '機車' }}</b>
          <span>區域</span><b>{{ selectedLot.campus_area }}</b>
          <span>回報</span><b>{{ selectedLot.report_count || 0 }} 筆</b>
          <span>預約</span><b>{{ selectedLot.is_partner ? '可預約' : '暫不開放' }}</b>
        </div>
        <p class="note">{{ selectedLot.status_note || '目前無特殊備註' }}</p>
      </aside>
    </div>
  </section>
</template>
