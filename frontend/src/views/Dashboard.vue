<template>
  <div class="flex min-h-screen bg-gray-100">

    <!-- MAIN -->
    <main class="flex-1 p-8">

      <!-- HEADER -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Claims Dashboard</h1>
        <input placeholder="Search..." class="border p-2 rounded w-64" />
      </div>

      <!-- CARDS -->
      <div class="grid grid-cols-4 gap-6 mb-8">
        <div class="bg-white p-4 rounded shadow">
          <p>Total</p>
          <h2 class="text-xl font-bold">{{ total }}</h2>
        </div>

        <div class="bg-white p-4 rounded shadow">
          <p>Open</p>
          <h2 class="text-xl font-bold">{{ open }}</h2>
        </div>

        <div class="bg-white p-4 rounded shadow">
          <p>Pending</p>
          <h2 class="text-xl font-bold">{{ pending }}</h2>
        </div>

        <div class="bg-white p-4 rounded shadow">
          <p>Approved</p>
          <h2 class="text-xl font-bold">{{ approved }}</h2>
        </div>
      </div>

      <!-- TABLE -->
      <div class="bg-white rounded shadow p-4">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b">
              <th class="p-2">Name</th>
              <th>Email</th>
              <th>City</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="c in claims" :key="c.id" class="border-b">
              <td class="p-2">{{ c.first_name }} {{ c.last_name }}</td>
              <td>{{ c.email }}</td>
              <td>{{ c.city }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </main>
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