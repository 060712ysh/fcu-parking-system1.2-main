<script setup>
defineProps({ hotspots: Array, reports: { type: Array, default: () => [] } })
function typeText(type) {
  return { full: '滿車/現場不符', broken: '設備故障', tow: '拖吊警示', illegal: '違停熱點' }[type] || type
}
</script>
<template>
  <section class="card warning-card">
    <h2>逢甲拖吊與即時回報區塊</h2>
    <h3>今日拖吊/違停熱點</h3>
    <p v-if="!hotspots.length">今日尚無拖吊熱點回報。</p>
    <ul><li v-for="h in hotspots" :key="h.location"><strong>{{ h.location }}</strong>：{{ h.count }} 筆回報，{{ h.message }}</li></ul>

    <h3>即時回報紀錄</h3>
    <div v-if="!reports.length">尚無使用者回報。</div>
    <div class="report-list">
      <div v-for="r in reports" :key="r.id" class="report-item">
        <strong>{{ typeText(r.report_type) }}</strong>
        <span>｜{{ r.parking_lot_name || '周邊區域' }}</span>
        <div v-if="r.location" class="report-location">位置補充：{{ r.location }}</div>
        <p>{{ r.message || '沒有備註' }}</p>
      </div>
    </div>
  </section>
</template>
