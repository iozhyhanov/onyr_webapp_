import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  const isInspectionMode = ref(false)
  return { isInspectionMode }
})
