<template>
  <div class="create-claim">

    <!-- PAGE HEADER -->
    <div class="page-header">
      <div>
        <h1 class="page-title">New Claim</h1>
        <p class="page-subtitle">Fill in the details below to register a new insurance claim</p>
      </div>
    </div>

    <!-- SUCCESS / ERROR BANNER -->
    <div v-if="successMsg" class="banner banner-success">{{ successMsg }}</div>
    <div v-if="errorMsg" class="banner banner-error">{{ errorMsg }}</div>

    <form @submit.prevent="createClaim" class="form-wrapper">

      <!-- SECTION: CLAIMANT -->
      <div class="form-card">
        <div class="section-header">
          <h2 class="section-title">Claimant Details</h2>
          <p class="section-subtitle">Personal information of the policyholder</p>
        </div>
        <div class="form-grid">
          <div class="field">
            <label class="field-label">First Name</label>
            <input v-model="first_name" class="field-input" placeholder="e.g. John" required />
          </div>
          <div class="field">
            <label class="field-label">Last Name</label>
            <input v-model="last_name" class="field-input" placeholder="e.g. Smith" required />
          </div>
          <div class="field">
            <label class="field-label">Date of Birth</label>
            <input ref="dateInput" class="field-input" placeholder="YYYY-MM-DD" />
          </div>
          <div class="field">
            <label class="field-label">Phone</label>
            <input v-model="phone" class="field-input" placeholder="+353 01 234 5678" />
          </div>
          <div class="field field-full">
            <label class="field-label">Email</label>
            <input v-model="email" class="field-input" placeholder="john.smith@email.com" type="email" />
          </div>
        </div>
      </div>

      <!-- SECTION: ADDRESS -->
      <div class="form-card">
        <div class="section-header">
          <h2 class="section-title">Address</h2>
          <p class="section-subtitle">Claimant's residential address</p>
        </div>
        <div class="form-grid">
          <div class="field field-full">
            <label class="field-label">Address Line</label>
            <input v-model="address_line" class="field-input" placeholder="12 Oak Street" />
          </div>
          <div class="field">
            <label class="field-label">City</label>
            <input v-model="city" class="field-input" placeholder="Dublin" />
          </div>
          <div class="field">
            <label class="field-label">Postcode</label>
            <input v-model="postcode" class="field-input" placeholder="D01 F5P2" />
          </div>
          <div class="field field-full">
            <label class="field-label">Country</label>
            <input v-model="country" class="field-input" placeholder="Ireland" />
          </div>
        </div>
      </div>

      <!-- SECTION: POLICY -->
      <div class="form-card">
        <div class="section-header">
          <h2 class="section-title">Policy Details</h2>
          <p class="section-subtitle">Insurance and claim information</p>
        </div>
        <div class="form-grid">
          <div class="field">
            <label class="field-label">Insurer Name</label>
            <input v-model="insurer_name" class="field-input" placeholder="Allianz" required />
          </div>
          <div class="field">
            <label class="field-label">Policy Number</label>
            <input v-model="policy_number" class="field-input" placeholder="POL-2024-001234" required />
          </div>
          <div class="field">
            <label class="field-label">Policy Type</label>
            <select v-model="policy_type" class="field-input">
              <option value="" disabled>Select type</option>
              <option>Home</option>
              <option>Motor</option>
              <option>Commercial</option>
              <option>Travel</option>
              <option>Other</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Date of Loss</label>
            <input ref="dateLossInput" class="field-input" placeholder="YYYY-MM-DD" />
          </div>
        </div>
      </div>

      <!-- SUBMIT -->
      <div class="form-footer">
        <button type="submit" class="btn-submit" :disabled="loading">
          <span v-if="loading">Submitting…</span>
          <span v-else>Submit Claim</span>
        </button>
      </div>

    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import flatpickr from "flatpickr"
import "flatpickr/dist/flatpickr.css"
import { api } from "@/utils/api"

const first_name    = ref("")
const last_name     = ref("")
const date_of_birth = ref("")
const phone         = ref("")
const email         = ref("")
const address_line  = ref("")
const city          = ref("")
const postcode      = ref("")
const country       = ref("")
const insurer_name  = ref("")
const policy_number = ref("")
const policy_type   = ref("")
const date_of_loss  = ref("")

const dateInput     = ref(null)
const dateLossInput = ref(null)
const loading       = ref(false)
const successMsg    = ref("")
const errorMsg      = ref("")

onMounted(() => {
  flatpickr(dateInput.value, {
    dateFormat: "Y-m-d",
    locale: "en",
    onChange: (_, dateStr) => { date_of_birth.value = dateStr }
  })
  flatpickr(dateLossInput.value, {
    dateFormat: "Y-m-d",
    locale: "en",
    onChange: (_, dateStr) => { date_of_loss.value = dateStr }
  })
})

async function createClaim() {
  loading.value = true
  successMsg.value = ""
  errorMsg.value = ""

  try {
    const response = await api.post("/api/claims", {
      first_name: first_name.value,
      last_name: last_name.value,
      date_of_birth: date_of_birth.value,
      phone: phone.value,
      email: email.value,
      address_line: address_line.value,
      city: city.value,
      postcode: postcode.value,
      country: country.value,
      insurer_name: insurer_name.value,
      policy_number: policy_number.value,
      policy_type: policy_type.value,
      date_of_loss: date_of_loss.value
    })

    successMsg.value = "Claim submitted successfully."
    first_name.value = last_name.value = date_of_birth.value = phone.value = ""
    email.value = address_line.value = city.value = postcode.value = country.value = ""
    insurer_name.value = policy_number.value = policy_type.value = date_of_loss.value = ""

  } catch (err) {
    errorMsg.value = "Failed to submit claim: " + err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.create-claim {
  padding: 28px 32px;
  background: #f1f5f9;
  min-height: 100vh;
  font-family: 'DM Sans', Arial, sans-serif;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 2px;
}

.page-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.banner {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 16px;
  font-weight: 500;
}

.banner-success {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.banner-error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.form-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 2px;
}

.section-subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px 24px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-full {
  grid-column: span 2;
}

.field-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
}

.field-input {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #0f172a;
  background: #fff;
  outline: none;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.field-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}

.field-input::placeholder {
  color: #cbd5e1;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
}

.btn-submit {
  padding: 9px 24px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.btn-submit:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
