<script setup>
import { reactive, ref, watch } from 'vue'
const props = defineProps({ user: Object, lots: Array, activeLocation: Object })
const emit = defineEmits(['save','clear'])
const form = reactive({ parkingLotName:'', parkingLotId:null, floor:'', spaceNumber:'', memo:'', imageUrl:'' })
watch(() => form.parkingLotId, id => {
  const lot = props.lots.find(l => l.id === Number(id))
  if (lot) form.parkingLotName = lot.name
})
</script>
<template>
  <section class="card">
    <h2>找尋愛車記錄</h2>
    <div v-if="activeLocation" class="current-car">
      <strong>目前記錄：</strong>{{ activeLocation.parking_lot_name }} {{ activeLocation.floor }} {{ activeLocation.space_number }}
      <p>{{ activeLocation.memo }}</p>
      <button @click="emit('clear')">清除記錄</button>
    </div>
    <div class="form-grid">
      <select v-model="form.parkingLotId"><option :value="null">選擇停車場</option><option v-for="lot in lots" :value="lot.id" :key="lot.id">{{ lot.name }}</option></select>
      <input v-model="form.floor" placeholder="樓層，例如 B1" />
      <input v-model="form.spaceNumber" placeholder="車格編號，例如 A-12" />
      <input v-model="form.imageUrl" placeholder="圖片連結，可不填" />
      <textarea v-model="form.memo" placeholder="備忘錄"></textarea>
    </div>
    <button class="primary" :disabled="!user" @click="emit('save', form)">儲存停車位置</button>
  </section>
</template>
