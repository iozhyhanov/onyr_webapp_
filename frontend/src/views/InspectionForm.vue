<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">

      <h1 class="text-2xl font-bold mb-6">Inspection Form</h1>

      <div class="flex gap-2 mb-6">
        <div
          v-for="n in 3"
          :key="n"
          :class="['flex-1 h-2 rounded', step >= n ? 'bg-blue-500' : 'bg-gray-300']"
        />
      </div>

      <div v-if="step === 1" class="space-y-6">

        <div class="bg-white p-6 rounded shadow">
          <h2 class="font-bold mb-4">Select Claim</h2>

          <select v-model="selectedClaimId" class="border p-2 w-full">
            <option disabled value="">Select claim</option>

            <option v-for="c in claims" :key="c.claim_id" :value="c.claim_id">
              {{ c.claim_id }} - {{ c.first_name }} {{ c.last_name }}
            </option>
          </select>
        </div>

        <div class="bg-white p-6 rounded shadow">
          <h2 class="font-bold mb-4">Inspection Type</h2>

          <select v-model="inspection.object_type" class="border p-2 w-full">
            <option disabled value="">Select type</option>
            <option value="vehicle">Vehicle</option>
            <option value="property">Property</option>
          </select>
        </div>

        <div class="bg-white p-6 rounded shadow">
          <h2 class="font-bold mb-4">Inspection Info</h2>

          <input v-model="inspection.inspector_name" placeholder="Inspector Name" class="border p-2 w-full mb-2" />
          <input v-model="inspection.inspection_date" type="date" class="border p-2 w-full mb-2" />
          <input v-model="inspection.location" placeholder="Location" class="border p-2 w-full mb-2" />
        </div>

        <div v-if="inspection.object_type === 'vehicle'" class="bg-white p-6 rounded shadow">
          <h2 class="font-bold mb-4">Vehicle Details</h2>

          <div class="grid grid-cols-2 gap-4">
            <input v-model="inspection.vehicle.make" placeholder="Make" class="border p-2" />
            <input v-model="inspection.vehicle.model" placeholder="Model" class="border p-2" />
            <input v-model="inspection.vehicle.vin" placeholder="VIN" class="border p-2" />
            <input v-model="inspection.vehicle.registration" placeholder="Registration" class="border p-2" />
          </div>
        </div>

        <div v-if="inspection.object_type === 'property'" class="bg-white p-6 rounded shadow">
          <h2 class="font-bold mb-4">Property Details</h2>

          <input v-model="inspection.property.address" placeholder="Address" class="border p-2 w-full mb-2" />
          <input v-model="inspection.property.type" placeholder="Property Type" class="border p-2 w-full mb-2" />

          <textarea
            v-model="inspection.property.damage"
            class="border p-2 w-full h-32"
            placeholder="Describe property damage..."
          />
        </div>

        <button
          :disabled="!selectedClaimId || !inspection.object_type"
          @click="step++"
          class="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Next
        </button>

      </div>

        <div v-if="step === 2" class="space-y-6">

          <!-- VEHICLE -->
          <div v-if="inspection.object_type === 'vehicle'">

            <div class="bg-white p-6 rounded shadow">
              <h2 class="font-bold mb-4">Vehicle Damage</h2>

              <label><input type="checkbox" v-model="inspection.damage.scratches" /> Scratches</label>
              <label><input type="checkbox" v-model="inspection.damage.dents" /> Dents</label>
              <label><input type="checkbox" v-model="inspection.damage.broken_lights" /> Broken Lights</label>
              <label><input type="checkbox" v-model="inspection.damage.tire_damage" /> Tire Damage</label>
            </div>

          </div>

          <!-- PROPERTY -->
          <div v-if="inspection.object_type === 'property'">

            <div class="bg-white p-6 rounded shadow">
              <h2 class="font-bold mb-4">Property Damage</h2>

              <label><input type="checkbox" v-model="inspection.property_damage.water" /> Water Damage</label>
              <label><input type="checkbox" v-model="inspection.property_damage.fire" /> Fire Damage</label>
              <label><input type="checkbox" v-model="inspection.property_damage.cracks" /> Wall Cracks</label>
              <label><input type="checkbox" v-model="inspection.property_damage.roof" /> Roof Damage</label>
            </div>

          </div>

          <!-- OTHER -->
          <div v-if="inspection.object_type === 'other'">

            <div class="bg-white p-6 rounded shadow">
              <h2 class="font-bold mb-4">Other Damage</h2>

              <textarea
                v-model="inspection.damage.description"
                class="border p-2 w-full h-32"
                placeholder="Describe damage..."
              ></textarea>
            </div>


          <!-- ОБЩЕЕ описание -->
          <div class="bg-white p-6 rounded shadow">
            <h2 class="font-bold mb-4">Damage Description</h2>

            <textarea
              v-model="inspection.damage.description"
              class="border p-2 w-full h-32"
            ></textarea>
          </div>

          <div class="flex gap-2">
            <button @click="step--" class="bg-gray-300 px-4 py-2 rounded">Back</button>
            <button @click="step++" class="bg-blue-600 text-white px-4 py-2 rounded">Next</button>
          </div>

        </div>

        <div class="flex gap-2">
          <button @click="step--" class="bg-gray-300 px-4 py-2 rounded">
            Back
          </button>

          <button @click="step++" class="bg-blue-600 text-white px-4 py-2 rounded">
            Next
          </button>
        </div>

      </div>

      <!-- STEP 3 -->
      <div v-if="step === 3" class="space-y-6">

        <div class="bg-white p-6 rounded shadow">
          <h2 class="font-bold mb-4">Final Notes</h2>

          <textarea
            v-model="inspection.notes"
            class="border p-2 w-full h-32"
            placeholder="Additional notes..."
          />
        </div>

        <div class="flex gap-2">
          <button @click="step--" class="bg-gray-300 px-4 py-2 rounded">
            Back
          </button>

          <button @click="submitInspection" class="bg-green-600 text-white px-4 py-2 rounded">
            Save Inspection
          </button>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const step = ref(1)
const claims = ref([])
const selectedClaimId = ref("")

const inspection = ref({
  object_type: "vehicle",

  inspector_name: "",
  inspection_date: "",
  location: "",

  vehicle: {
    make: "",
    model: "",
    vin: "",
    registration: ""
  },

  property: {
    address: "",
    type: ""
  },

  vehicle_damage: {
    scratches: false,
    dents: false,
    broken_lights: false,
    tire_damage: false
  },

  property_damage: {
    water: false,
    fire: false,
    cracks: false,
    roof: false
  },

  description: "",
  notes: ""
})

onMounted(async () => {
  try {
    const res = await fetch("http://localhost:5000/api/claims")
    claims.value = await res.json()
  } catch (err) {
    console.error(err)
  }
})

const submitInspection = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/inspections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...inspection.value,
        claim_id: selectedClaimId.value
      })
    })

    if (!res.ok) throw new Error("Failed")

    alert("Saved!")
  } catch (err) {
    console.error(err)
  }
}
</script>