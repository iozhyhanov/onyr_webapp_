<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">

      <!-- Logo / Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">ONYR</h1>
        <p class="text-gray-500 text-sm mt-1">Insurance Claims System</p>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
        {{ error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            v-model="form.username"
            type="text"
            autocomplete="username"
            required
            placeholder="Enter username"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Enter password"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? "Signing in..." : "Sign in" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth.store"
import { api } from "../utils/api"

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({ username: "", password: "" })
const loading = ref(false)
const error = ref("")

async function handleLogin() {
  error.value = ""
  loading.value = true
  try {
    const data = await api.post<{ token: string; user: any }>("/api/auth/login", {
      username: form.username,
      password: form.password,
    })
    authStore.login(data.token, data.user)
    router.push("/")
  } catch (err: any) {
    error.value = err.message || "Login failed"
  } finally {
    loading.value = false
  }
}
</script>
