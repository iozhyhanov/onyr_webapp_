<template>
  <div class="w-full h-full bg-gray-900 text-white p-4 flex flex-col">

    <!-- Logo header -->
    <div class="logo-header">
      <!-- Placeholder logo — replace src with your own image -->
      <div class="logo-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="9" height="9" rx="2" fill="#3b82f6"/>
          <rect x="12" y="1" width="9" height="9" rx="2" fill="#3b82f6" opacity="0.5"/>
          <rect x="1" y="12" width="9" height="9" rx="2" fill="#3b82f6" opacity="0.5"/>
          <rect x="12" y="12" width="9" height="9" rx="2" fill="#3b82f6"/>
        </svg>
      </div>
      <span class="logo-text">ONYR</span>
    </div>

    <nav class="flex-1">

      <!-- Claims -->
      <router-link to="/" class="nav-link">Dashboard</router-link>
      <router-link to="/claims" class="nav-link">Claims</router-link>
      <router-link to="/create-claim" class="nav-link">Create Claim</router-link>

      <!-- Field Work -->
      <div class="section-divider">
        <div class="divider-line"></div>
        <span class="divider-label">Field Work</span>
        <div class="divider-line"></div>
      </div>
      <router-link to="/fnol" class="nav-link">FNOL</router-link>
      <router-link to="/inspection/new" class="nav-link">Inspection Form</router-link>
      <router-link to="/preliminary-report" class="nav-link">Preliminary Report</router-link>

      <!-- Admin -->
      <template v-if="authStore.isAdmin">
        <div class="section-divider">
          <div class="divider-line"></div>
          <span class="divider-label">Admin</span>
          <div class="divider-line"></div>
        </div>
        <router-link to="/admin/users" class="nav-link">User Management</router-link>
      </template>

    </nav>
  </div>
</template>

<style scoped>
.logo-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0 20px;
  border-bottom: 1px solid #1e293b;
  margin-bottom: 16px;
}

.logo-icon {
  position: absolute;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #1e293b;
  border-radius: 8px;
}

.logo-text {
  font-size: 17px;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: 0.12em;
}

.nav-link {
  display: block;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: #94a3b8;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  margin-bottom: 2px;
}

.nav-link:hover {
  background: #1e293b;
  color: #e2e8f0;
}

.nav-link.router-link-exact-active {
  background: #1e3a5f;
  color: #93c5fd;
  font-weight: 600;
}

.section-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0 10px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #1e293b;
}

.divider-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
  white-space: nowrap;
}
</style>

<script setup lang="ts">
import { useAuthStore } from "../../stores/auth.store"

const authStore = useAuthStore()
</script>
