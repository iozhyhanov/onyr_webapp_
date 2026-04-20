<template>
  <div class="flex h-screen">
    <Sidebar />

    <div class="flex flex-col flex-1">
      <Topbar />

      <main class="p-6 bg-gray-50 flex-1 overflow-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import Sidebar from '../components/sidebar/Sidebar.vue'
import Topbar from '../components/header/Topbar.vue'
</script>