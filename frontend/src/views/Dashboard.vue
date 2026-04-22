<template>
  <div class="container">
    <h2>Dashboard</h2>

    <div class="cards">
      <div class="card">
        <p>Total Claims</p>
        <strong>{{ total }}</strong>
      </div>

      <div class="card">
        <p>Open</p>
        <strong>{{ open }}</strong>
      </div>

      <div class="card">
        <p>Pending</p>
        <strong>{{ pending }}</strong>
      </div>

      <div class="card">
        <p>Approved</p>
        <strong>{{ approved }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const claims = ref([])
const total = ref(0)
const open = ref(0)
const pending = ref(0)
const approved = ref(0)

onMounted(async () => {
  try {
    const res = await fetch("http://localhost:5000/api/customers")

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text)
    }

    const data = await res.json()

    // Security
    if (!Array.isArray(data)) {
      throw new Error("API did not return array")
    }

    claims.value = data

    total.value = data.length
    open.value = data.filter(c => c.status === "open").length
    pending.value = data.filter(c => c.status === "pending").length
    approved.value = data.filter(c => c.status === "approved").length

  } catch (err) {
    console.error("❌ Error to load claims:", err)
  }
})
</script>