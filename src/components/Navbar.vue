<script setup>
defineProps({ user: Object })
defineEmits(['logout'])
</script>
<template>
  <nav class="navbar">
    <div>
      <p class="eyebrow">Friendly Campus</p>
      <h1>逢甲大學友善校園｜停車系統</h1>
    </div>
    <div class="user-box" v-if="user">
      <span>{{ user.name }}｜{{ user.role }}｜錢包 ${{ user.wallet_balance }}</span>
      <button @click="$emit('logout')">登出</button>
    </div>
  </nav>
</template>
