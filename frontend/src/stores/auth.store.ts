import { defineStore } from "pinia"
import { ref, computed } from "vue"

export interface AuthUser {
  user_id: number
  username: string
  full_name: string | null
  role: "admin" | "worker"
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("token"))
  const user = ref<AuthUser | null>(
    JSON.parse(localStorage.getItem("auth_user") || "null")
  )

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === "admin")
  const displayName = computed(
    () => user.value?.full_name || user.value?.username || ""
  )

  function login(newToken: string, newUser: AuthUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem("token", newToken)
    localStorage.setItem("auth_user", JSON.stringify(newUser))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem("token")
    localStorage.removeItem("auth_user")
  }

  return { token, user, isAuthenticated, isAdmin, displayName, login, logout }
})
