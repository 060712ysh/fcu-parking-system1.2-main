<script setup>
import { reactive } from 'vue'
const props = defineProps({ lots: Array, user: Object, favoriteIds: { type: Array, default: () => [] } })
defineEmits(['favorite','report','reserve','select'])
const reserveHours = reactive({})
const reportForms = reactive({})
function getHours(lotId) {
  const value = Number(reserveHours[lotId] || 1)
  return Number.isFinite(value) && value > 0 ? value : 1
}
function isFavorite(id) {
  return props.favoriteIds.includes(id)
}
function ensureReportForm(id) {
  if (!reportForms[id]) reportForms[id] = { open: false, reportType: 'full', message: '', locationDetail: '' }
  return reportForms[id]
}
function toggleReport(id) {
  const form = ensureReportForm(id)
  form.open = !form.open
}
function submitReport(lot, emit) {
  const form = ensureReportForm(lot.id)
  emit('report', {
    lot,
    reportType: form.reportType,
    location: form.locationDetail ? `${lot.name}｜${form.locationDetail}` : lot.name,
    message: form.message || '使用者回報現場狀況異常'
  })
  form.open = false
  form.message = ''
  form.locationDetail = ''
  form.reportType = 'full'
}
</script>
<template>
  <section class="parking-list">
    <article v-for="lot in lots" :key="lot.id" class="card lot-card" :class="{ 'favorited-card': isFavorite(lot.id) }" @click="$emit('select', lot)">
      <div class="lot-title">
        <span class="light" :class="lot.light"></span>
        <div>
          <h3>{{ lot.name }}</h3>
          <p>{{ lot.address }}</p>
        </div>
        <button class="heart" :class="{ 'favorite-active': isFavorite(lot.id) }" @click.stop="$emit('favorite', lot)">
          {{ isFavorite(lot.id) ? '♥' : '♡' }}
        </button>
      </div>
      <div v-if="isFavorite(lot.id)" class="favorite-ribbon">♥ 已加入收藏</div>
      <div class="lot-meta">
        <span>剩餘 {{ lot.available_spaces }}/{{ lot.total_spaces }}</span><span>每小時 ${{ lot.hourly_rate }}</span><span>列表估算 ${{ lot.estimated_fee }}</span><span>{{ lot.distance_to_gate }}m</span>
      </div>
      <div class="tags"><b v-for="tag in lot.tags" :key="tag">{{ tag }}</b><b v-if="lot.is_partner">可預約</b><b v-if="lot.is_student_only">師生限定</b><b v-if="lot.report_count">回報 {{ lot.report_count }} 筆</b></div>
      <div v-if="lot.is_partner" class="reserve-box" @click.stop>
        <label>預約時數
          <input v-model.number="reserveHours[lot.id]" type="number" min="1" step="0.5" placeholder="1" />
        </label>
        <strong>先扣款：${{ Math.ceil(getHours(lot.id) * lot.hourly_rate) }}</strong>
      </div>
      <div class="actions">
        <button @click.stop="toggleReport(lot.id)">{{ ensureReportForm(lot.id).open ? '收合回報' : '回報錯誤' }}</button>
        <button class="primary" :disabled="!lot.is_partner || !user" @click.stop="$emit('reserve', { lot, reserveHours: getHours(lot.id) })">預約 15 分鐘</button>
      </div>

      <div v-if="ensureReportForm(lot.id).open" class="report-form" @click.stop>
        <h4>回報 {{ lot.name }} 狀況</h4>
        <div class="form-grid compact">
          <label>問題類型
            <select v-model="ensureReportForm(lot.id).reportType">
              <option value="full">滿車 / 現場與系統不符</option>
              <option value="broken">設備故障</option>
              <option value="illegal">違停熱點</option>
              <option value="tow">拖吊警示</option>
            </select>
          </label>
          <label>位置補充
            <input v-model="ensureReportForm(lot.id).locationDetail" placeholder="例如 B1、入口處、充電樁旁" />
          </label>
        </div>
        <textarea v-model="ensureReportForm(lot.id).message" placeholder="請填入詳細錯誤資訊，例如：現場已滿車，但系統顯示還有 20 格；或 B1 繳費機無法使用。"></textarea>
        <button class="primary" @click="submitReport(lot, $emit)">送出回報</button>
      </div>
    </article>
  </section>
</template>
