<template>
  <div class="flex min-h-screen bg-gray-100">

    <!-- MAIN -->
    <main class="flex-1 p-8">

      <!-- HEADER -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Dashboard</h1>
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
              <th>Policy</th>
              <th>Insurer</th>
              <th>Date of Loss</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="c in claims" :key="c.claim_id" class="border-b">
              <td class="p-2">{{ c.first_name }} {{ c.last_name }}</td>
              <td>{{ c.email }}</td>
              <td>{{ c.policy_number }}</td>
              <td>{{ c.insurer_name }}</td>
              <td>{{ formatDate(c.date_of_loss) }}</td>
              <td>
                <span
                  :class="{
                    'text-green-600': c.claim_status === 'approved',
                    'text-yellow-600': c.claim_status === 'pending',
                    'text-blue-600': c.claim_status === 'open'
                  }"
                >
                  {{ c.claim_status }}
                </span>
              </td>

              <td class="relative text-center align-middle">
                <div
                  @click.stop="toggleMenu(c.claim_id)"
                  class="flex items-center justify-center w-full h-full cursor-pointer"
                >
                  <MoreVertical class="w-5 h-5 text-gray-500 hover:text-black" />
                </div>

                <div
                  v-if="activeMenu === c.claim_id"
                  class="absolute right-2 top-8 w-40 bg-white border rounded-lg shadow-lg z-10"
                >
                  <div
                    @click="openModal(c)"
                    class="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-sm cursor-pointer"
                  >
                    <Info class="w-4 h-4" />
                    Information
                  </div>

                  <div
                    @click="openEdit(c)"
                    class="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-sm cursor-pointer"
                  >
                    Edit
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
        <div v-if="selectedClaim" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div class="bg-white p-6 rounded w-[600px] max-h-[90vh] overflow-y-auto">

            <h2 class="text-xl font-bold mb-4">Full Claim Information</h2>

            <!-- CUSTOMER -->
            <p><b>First Name:</b> {{ selectedClaim.first_name }}</p>
            <p><b>Last Name:</b> {{ selectedClaim.last_name }}</p>
            <p><b>Date of Birth:</b> {{ formatDate(selectedClaim.date_of_birth) }}</p>
            <p><b>Phone:</b> {{ selectedClaim.phone }}</p>
            <p><b>Email:</b> {{ selectedClaim.email }}</p>

            <h4 class="font-semibold mt-2">Address</h4>
            <p>{{ selectedClaim.address_line }}</p>
            <p>{{ selectedClaim.city }}, {{ selectedClaim.postcode }}</p>
            <p>{{ selectedClaim.country }}</p>

            <hr class="my-3">

            <!-- CLAIM -->
            <p><b>Insurer:</b> {{ selectedClaim.insurer_name }}</p>
            <p><b>Policy Number:</b> {{ selectedClaim.policy_number }}</p>
            <p><b>Policy Type:</b> {{ selectedClaim.policy_type }}</p>
            <p><b>Date of Loss:</b> {{ formatDate(selectedClaim.date_of_loss) }}</p>
            <p><b>Status:</b> {{ selectedClaim.claim_status }}</p>

            <button @click="selectedClaim = null" class="mt-4 bg-gray-200 px-4 py-2 rounded">
              Close
            </button>
          </div>
        </div>

        <div v-if="isEditMode" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div class="bg-white p-6 rounded w-[600px]">

            <h2 class="text-xl font-bold mb-4">Edit Claim</h2>

            <input v-model="editClaim.first_name" class="border p-2 w-full mb-2" />
            <input v-model="editClaim.last_name" class="border p-2 w-full mb-2" />
            <input v-model="editClaim.email" class="border p-2 w-full mb-2" />

            <select v-model="editClaim.claim_status" class="border p-2 w-full mb-2">
              <option>open</option>
              <option>pending</option>
              <option>approved</option>
            </select>

            <div class="flex justify-end gap-2">
              <button @click="isEditMode = false" class="px-4 py-2 bg-gray-200">
                Cancel
              </button>

              <button @click="saveClaim" class="px-4 py-2 bg-blue-600 text-white">
                Save
              </button>
            </div>

          </div>
        </div>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { MoreVertical, Info } from "lucide-vue-next"

const claims = ref([])
const total = ref(0)
const open = ref(0)
const pending = ref(0)
const approved = ref(0)

 const formatDate = (date) => {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-GB")
}

const activeMenu = ref(null)
const selectedClaim = ref(null)

const toggleMenu = (id) => {
  activeMenu.value = activeMenu.value === id ? null : id
}

const openModal = (claim) => {
  selectedClaim.value = claim
  activeMenu.value = null
}

const isEditMode = ref(false)
const editClaim = ref(null)

const openEdit = (claim) => {
  editClaim.value = { ...claim }
  isEditMode.value = true
}


onMounted(async () => {
  try {
    const res = await fetch("http://localhost:5000/api/claims")

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text)
    }

    const data = await res.json()

    // Security
    if (!Array.isArray(data)) {
      throw new Error("API did not return array")
    }

    if (data.length === 0) {
      console.warn("No claims found")
    }


    claims.value = data

    total.value = data.length
    open.value = data.filter(c => c.claim_status === "open").length
    pending.value = data.filter(c => c.claim_status === "pending").length
    approved.value = data.filter(c => c.claim_status === "approved").length

  } catch (err) {
    console.error("Error to load claims:", err)
  }
})

const saveClaim = async () => {
  try {
    const res = await fetch(`http://localhost:5000/api/claims/${editClaim.value.claim_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(editClaim.value)
    })

    if (!res.ok) throw new Error("Update failed")

    const index = claims.value.findIndex(c => c.claim_id === editClaim.value.claim_id)

    if (index !== -1) {
      claims.value[index] = { ...editClaim.value }
    }

    isEditMode.value = false
    editClaim.value = null

  } catch (err) {
    console.error(err)
  }
}

</script>