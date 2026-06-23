<script setup>
const model = defineModel()
</script>
<template>
  <section class="card filter-panel">
    <h2>進階篩選與費用估算</h2>
    <label>車種
      <select v-model="model.vehicleType">
        <option value="all">全部</option><option value="car">汽車格</option><option value="motorcycle">機車格</option>
      </select>
    </label>
    <label>區域
      <select v-model="model.area">
        <option value="all">全部</option><option>校內頂級憑證格</option><option>校外一般停車場</option>
      </select>
    </label>
    <label>預計停車時數<input v-model.number="model.hours" type="number" min="1" /></label>
    <div class="chips">
      <label><input type="checkbox" value="disabled" v-model="model.special" /> 身障車位</label>
      <label><input type="checkbox" value="parentChild" v-model="model.special" /> 婦幼車位</label>
      <label><input type="checkbox" value="ev" v-model="model.special" /> 充電樁格</label>
    </div>
  </section>
</template>
