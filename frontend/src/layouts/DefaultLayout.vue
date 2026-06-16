<template>
  <div class="flex h-screen">

    <!-- Sidebar wrapper — always same width, clips sliding panels -->
    <div class="sidebar-host">
      <!-- Main nav sidebar -->
      <div
        class="sidebar-panel"
        :class="sidebarStore.isInspectionMode ? 'sidebar-panel--hidden-left' : 'sidebar-panel--visible'"
      >
        <Sidebar />
      </div>

      <!-- Inspection sidebar slot — always in DOM so Teleport always has a target -->
      <div
        id="inspection-sidebar-target"
        class="sidebar-panel"
        :class="sidebarStore.isInspectionMode ? 'sidebar-panel--visible' : 'sidebar-panel--hidden-right'"
      />
    </div>

    <div class="flex flex-col flex-1 overflow-hidden">
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
import { useSidebarStore } from '../stores/sidebar.store'

const sidebarStore = useSidebarStore()
</script>

<style scoped>
.sidebar-host {
  position: relative;
  width: 256px;   /* same as w-64 */
  min-width: 256px;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-panel {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              opacity  0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-panel--visible {
  transform: translateX(0);
  opacity: 1;
}

.sidebar-panel--hidden-left {
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none;
}

.sidebar-panel--hidden-right {
  transform: translateX(100%);
  opacity: 0;
  pointer-events: none;
}
</style>
