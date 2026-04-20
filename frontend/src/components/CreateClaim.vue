<template>
  <div>
    <input v-model="first_name" placeholder="First Name" />
    <input v-model="last_name" placeholder="Last Name" />
    <input type="date" v-model="date_of_birth" />
    <input v-model="phone" placeholder="Phone" />
    <input v-model="email" placeholder="Email" />
    <input v-model="address_line" placeholder="Address" />
    <input v-model="city" placeholder="City" />
    <input v-model="postcode" placeholder="Postcode" />
    <input v-model="country" placeholder="Country" />

    <button @click="createCustomer">
      Speichern
    </button>
  </div>
</template>

<script setup>
import { ref } from "vue"

const first_name = ref("")
const last_name = ref("")
const date_of_birth = ref("")
const phone = ref("")
const email = ref("")
const address_line = ref("")
const city = ref("")
const postcode = ref("")
const country = ref("")

async function createCustomer() {
  try {
    const response = await fetch("http://localhost:3000/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        first_name: first_name.value,
        last_name: last_name.value,
        date_of_birth: date_of_birth.value,
        phone: phone.value,
        email: email.value,
        address_line: address_line.value,
        city: city.value,
        postcode: postcode.value,
        country: country.value
      })
    })

    // 🔥 ВОТ ЭТО ДОБАВЬ ОБЯЗАТЕЛЬНО
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text)
    }

    const result = await response.json()
    console.log("✅ OK:", result)

  } catch (err) {
    console.error("❌ FEHLER:", err.message)
  }
}
</script>