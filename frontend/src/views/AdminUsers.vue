<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">User Management</h1>

    <!-- Create User Card -->
    <div class="bg-white rounded-xl shadow p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Create New Account</h2>

      <div v-if="createError" class="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
        {{ createError }}
      </div>
      <div v-if="createSuccess" class="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
        {{ createSuccess }}
      </div>

      <form @submit.prevent="createUser" class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            v-model="newUser.full_name"
            type="text"
            placeholder="John Smith"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Username <span class="text-red-500">*</span></label>
          <input
            v-model="newUser.username"
            type="text"
            required
            placeholder="john.smith"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password <span class="text-red-500">*</span></label>
          <input
            v-model="newUser.password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            v-model="newUser.role"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          >
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div class="col-span-2 flex justify-end">
          <button
            type="submit"
            :disabled="creating"
            class="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
          >
            {{ creating ? "Creating..." : "Create Account" }}
          </button>
        </div>
      </form>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-xl shadow overflow-hidden">
      <div class="px-6 py-4 border-b">
        <h2 class="text-lg font-semibold">All Accounts</h2>
      </div>

      <div v-if="loading" class="p-8 text-center text-gray-400 text-sm">Loading...</div>

      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 uppercase text-xs">
          <tr>
            <th class="px-6 py-3 text-left">Full Name</th>
            <th class="px-6 py-3 text-left">Username</th>
            <th class="px-6 py-3 text-left">Role</th>
            <th class="px-6 py-3 text-left">Created</th>
            <th class="px-6 py-3 text-left"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="u in users" :key="u.user_id" class="hover:bg-gray-50">
            <td class="px-6 py-4 font-medium">{{ u.full_name || "—" }}</td>
            <td class="px-6 py-4 text-gray-600">{{ u.username }}</td>
            <td class="px-6 py-4">
              <span
                :class="u.role === 'admin'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'"
                class="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
              >
                {{ u.role }}
              </span>
            </td>
            <td class="px-6 py-4 text-gray-400">{{ formatDate(u.created_at) }}</td>
            <td class="px-6 py-4 text-right w-12">
              <button
                v-if="u.user_id !== currentUserId"
                @click="deleteUser(u)"
                class="trash-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
              <span v-else class="text-gray-300 text-xs">you</span>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-gray-400">No users found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { useAuthStore } from "../stores/auth.store"
import { api } from "../utils/api"

const authStore = useAuthStore()
const currentUserId = authStore.user?.user_id

interface User {
  user_id: number
  username: string
  full_name: string | null
  role: "admin" | "worker"
  created_at: string
}

const users = ref<User[]>([])
const loading = ref(true)
const creating = ref(false)
const createError = ref("")
const createSuccess = ref("")

const newUser = reactive({
  full_name: "",
  username: "",
  password: "",
  role: "worker" as "admin" | "worker",
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

onMounted(fetchUsers)

async function fetchUsers() {
  loading.value = true
  try {
    users.value = await api.get<User[]>("/api/users")
  } catch (err: any) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function createUser() {
  createError.value = ""
  createSuccess.value = ""
  creating.value = true
  try {
    await api.post("/api/users", {
      username: newUser.username,
      password: newUser.password,
      full_name: newUser.full_name || undefined,
      role: newUser.role,
    })
    createSuccess.value = `Account "${newUser.username}" created successfully`
    newUser.username = ""
    newUser.password = ""
    newUser.full_name = ""
    newUser.role = "worker"
    await fetchUsers()
  } catch (err: any) {
    createError.value = err.message || "Failed to create user"
  } finally {
    creating.value = false
  }
}

async function deleteUser(u: User) {
  if (!confirm(`Delete account "${u.username}"? This cannot be undone.`)) return
  try {
    await api.delete(`/api/users/${u.user_id}`)
    users.value = users.value.filter((x) => x.user_id !== u.user_id)
  } catch (err: any) {
    alert(err.message || "Delete failed")
  }
}
</script>

<style scoped>
.trash-btn {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: #ef4444;
  line-height: 0;
}
.trash-btn:hover {
  color: #b91c1c;
  background: #fef2f2;
}
</style>
