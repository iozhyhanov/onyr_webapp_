<template>
  <div class="h-14 bg-white border-b flex items-center justify-between px-4">
    <h2 class="font-semibold">Insurance Claims</h2>

    <div class="flex items-center gap-3">
      <!-- User name -->
      <span class="text-sm text-gray-600">
        {{ authStore.displayName }}
      </span>

      <!-- Logout button -->
      <button
        @click="handleLogout"
        class="flex items-center gap-1.5 text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign out
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router"
import { useAuthStore } from "../../stores/auth.store"

const authStore = useAuthStore()
const router = useRouter()

function handleLogout() {
  authStore.logout()
  router.push("/login")
}
</script>
