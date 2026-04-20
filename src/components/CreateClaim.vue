<template>
  <div class="p-6 space-y-4 max-w-md">
    <h2 class="text-xl font-bold">Create Claim</h2>

    <input v-model="customerName" placeholder="Customer Name" class="border p-2 w-full" />
    
    <input v-model="type" placeholder="Type" class="border p-2 w-full" />

    <select v-model="status" class="border p-2 w-full">
      <option value="new">New</option>
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>

    <select v-model="priority" class="border p-2 w-full">
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
    </select>

    <button
      @click="submitClaim"
      class="bg-blue-500 text-white px-4 py-2 rounded"
    >
      Save
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const customerName = ref('')
const type = ref('')
const status = ref('new')
const priority = ref('medium')

const submitClaim = async () => {
  const res = await fetch('http://localhost:3000/claims', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerName: customerName.value,
      type: type.value,
      status: status.value,
      priority: priority.value
    })
  })

  const data = await res.json()
  console.log('Saved claim:', data)

  alert('Claim saved!')
}
</script>