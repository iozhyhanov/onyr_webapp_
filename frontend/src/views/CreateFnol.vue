<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Create FNOL</h1>

    <select v-model="form.claim_id" class="border p-2 mb-2 w-full">
      <option disabled value="">Select Claim</option>
      <option 
        v-for="c in claims" 
        :key="c.claim_id" 
        :value="c.claim_id"
      >
        {{ c.first_name }} {{ c.last_name }} (ID: {{ c.claim_id }})
      </option>
    </select>

    <label class="block mb-1 text-sm font-semibold">
      Time of Incident
    </label>
    <input 
      v-model="form.loss_time" 
      type="time" 
      class="border p-2 mb-3 w-full" 
    />

    <input v-model="form.loss_location" placeholder="Location" class="border p-2 mb-2 w-full" />

    <input v-model="form.loss_type" placeholder="Type of loss" class="border p-2 mb-2 w-full" />

    <input v-model="form.short_description" placeholder="Short description" class="border p-2 mb-2 w-full" />

    <textarea v-model="form.detailed_description" placeholder="Details" class="border p-2 mb-2 w-full"></textarea>

    <label class="block mb-1 text-sm font-semibold">
      Third Party Involved?
    </label>
    <select 
      v-model="form.third_party_involved" 
      class="border p-2 mb-3 w-full"
    >
      <option :value="0">No</option>
      <option :value="1">Yes</option>
    </select>

    <input v-model="form.police_report_number" placeholder="Police Report No" class="border p-2 mb-2 w-full" />

    <button @click="createFnol" class="bg-blue-600 text-white px-4 py-2">
      Save FNOL
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const claims = ref([])

const form = ref({
  claim_id: "",
  loss_time: "",
  loss_location: "",
  loss_type: "",
  short_description: "",
  detailed_description: "",
  third_party_involved: 0,
  police_report_number: ""
})

onMounted(async () => {
  const res = await fetch("http://localhost:5000/api/claims")
  const data = await res.json()

  claims.value = data
})

const createFnol = async () => {
  const res = await fetch("http://localhost:5000/api/fnol", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(form.value)
  })

  if (res.ok) {
    alert("FNOL saved")
  }
}
</script>