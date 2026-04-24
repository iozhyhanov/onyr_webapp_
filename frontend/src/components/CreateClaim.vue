<template>
  <div>
    <input v-model="first_name" placeholder="First Name" />
    <input v-model="last_name" placeholder="Last Name" />
    <input ref="dateInput" placeholder="Date of Birth"/>
    <input v-model="phone" placeholder="Phone" />
    <input v-model="email" placeholder="Email" />
    <input v-model="address_line" placeholder="Address" />
    <input v-model="city" placeholder="City" />
    <input v-model="postcode" placeholder="Postcode" />
    <input v-model="country" placeholder="Country" />
    <input v-model="insurer_name" placeholder="Insurer Name" />
    <input v-model="policy_number" placeholder="Policy Number" />
    <input v-model="policy_type" placeholder="Policy Type" />
    <input ref="dateLossInput" placeholder="Date of Loss" />

    <button @click="createClaim">
      Submit
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import flatpickr from "flatpickr"
import "flatpickr/dist/flatpickr.css"


const first_name = ref("")
const last_name = ref("")
const date_of_birth = ref("")
const phone = ref("")
const email = ref("")
const address_line = ref("")
const city = ref("")
const postcode = ref("")
const country = ref("")
const dateInput = ref(null)
const insurer_name = ref("")
const policy_number = ref("")
const policy_type = ref("")
const date_of_loss = ref("")
const dateLossInput = ref(null)

onMounted(() => {
  flatpickr(dateInput.value, {
    dateFormat: "Y-m-d",
    locale: "en",
    onChange: (_, dateStr) => {
      date_of_birth.value = dateStr
    }
  })

  flatpickr(dateLossInput.value, {
    dateFormat: "Y-m-d",
    locale: "en",
    onChange: (_, dateStr) => {
      date_of_loss.value = dateStr
    }
  })
})

async function createClaim() {
  try {
    const response = await fetch("http://localhost:5000/api/claims", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // customer
        first_name: first_name.value,
        last_name: last_name.value,
        date_of_birth: date_of_birth.value,
        phone: phone.value,
        email: email.value,
        address_line: address_line.value,
        city: city.value,
        postcode: postcode.value,
        country: country.value,

        // claim
        insurer_name: insurer_name.value,
        policy_number: policy_number.value,
        policy_type: policy_type.value,
        date_of_loss: date_of_loss.value
      })
    })

  
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text)
    }

    const result = await response.json()
    console.log("✅ OK:", result)

  } catch (err) {
    console.error("❌ ERROR:", err.message)
  }
}
</script>