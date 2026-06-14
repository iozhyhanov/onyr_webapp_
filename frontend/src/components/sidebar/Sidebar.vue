<template>
  <div class="w-64 bg-gray-900 text-white p-4 flex flex-col">
    <h2 class="text-xl font-bold mb-6">ONYR</h2>

    <nav class="space-y-1 flex-1">
      <router-link to="/" class="block p-2 rounded hover:bg-gray-700 text-sm">
        Dashboard
      </router-link>

      <router-link to="/claims" class="block p-2 rounded hover:bg-gray-700 text-sm">
        Claims
      </router-link>

      <router-link to="/create-claim" class="block p-2 rounded hover:bg-gray-700 text-sm">
        Create Claim
      </router-link>

      <router-link to="/fnol" class="block p-2 rounded hover:bg-gray-700 text-sm">
        FNOL
      </router-link>

      <router-link to="/inspection/new" class="block p-2 rounded hover:bg-gray-700 text-sm">
        Inspection Form
      </router-link>

      <router-link to="/preliminary-report" class="block p-2 rounded hover:bg-gray-700 text-sm">
        Preliminary Report
      </router-link>

      <!-- Admin section -->
      <template v-if="authStore.isAdmin">
        <div class="border-t border-gray-700 my-3"></div>
        <p class="text-gray-500 text-xs uppercase px-2 mb-1">Admin</p>
        <router-link to="/admin/users" class="block p-2 rounded hover:bg-gray-700 text-sm">
          User Management
        </router-link>
      </template>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "../../stores/auth.store"

const authStore = useAuthStore()
</script>
