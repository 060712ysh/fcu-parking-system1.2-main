<script setup>
import { computed, reactive, ref } from 'vue'
const emit = defineEmits(['login', 'register'])
const mode = ref('login')
const form = reactive({
  name: '',
  email: 'student@fcu.edu.tw',
  password: '123456',
  role: 'student'
})
const isRegister = computed(() => mode.value === 'register')
function submit() {
  if (isRegister.value) emit('register', { ...form })
  else emit('login', { email: form.email, password: form.password })
}
</script>
<template>
  <section class="card login-card">
    <div class="login-tabs">
      <button :class="{active: !isRegister}" @click="mode='login'">登入</button>
      <button :class="{active: isRegister}" @click="mode='register'">註冊</button>
    </div>
    <h2>{{ isRegister ? '建立新帳號' : '校園身份登入' }}</h2>
    <p v-if="!isRegister">測試帳號：student@fcu.edu.tw / 123456，管理員：admin@fcu.edu.tw / admin123</p>
    <p v-else>註冊後會直接登入；師生帳號可查看校內機車棚資訊。</p>
    <input v-if="isRegister" v-model="form.name" placeholder="姓名，例如 王小明" />
    <select v-if="isRegister" v-model="form.role">
      <option value="student">逢甲在校師生</option>
      <option value="visitor">一般訪客</option>
    </select>
    <input v-model="form.email" placeholder="Email" />
    <input v-model="form.password" placeholder="Password" type="password" />
    <button class="primary" @click="submit">{{ isRegister ? '註冊並登入' : '登入系統' }}</button>
  </section>
</template>
