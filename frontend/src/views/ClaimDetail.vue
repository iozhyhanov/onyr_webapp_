<template>
  <div class="claim-detail">

    <!-- HEADER -->
    <div class="page-header">
      <div>
        <router-link to="/claims" class="back-link">← Back to Claims</router-link>
        <h1 class="page-title">Claim #{{ id }}</h1>
        <p class="page-subtitle" v-if="claim">
          {{ claim.first_name }} {{ claim.last_name }} · {{ claim.insurer_name }}
        </p>
      </div>
      <span v-if="claim" :class="['status-badge', statusClass(claim.claim_status)]">
        {{ claim.claim_status }}
      </span>
    </div>

    <div v-if="loading" class="state-msg">Loading...</div>
    <div v-else-if="error" class="state-msg state-error">{{ error }}</div>

    <div v-else-if="claim" class="cards">

      <!-- CLAIMANT -->
      <div class="card">
        <div class="card-header">Claimant Details</div>
        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">First Name</span>
              <span class="info-value">{{ claim.first_name || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Last Name</span>
              <span class="info-value">{{ claim.last_name || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date of Birth</span>
              <span class="info-value">{{ formatDate(claim.date_of_birth) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Phone</span>
              <span class="info-value">{{ claim.phone || '—' }}</span>
            </div>
            <div class="info-item info-full">
              <span class="info-label">Email</span>
              <span class="info-value">{{ claim.email || '—' }}</span>
            </div>
            <div class="info-item info-full">
              <span class="info-label">Address</span>
              <span class="info-value">
                {{ [claim.address_line, claim.city, claim.postcode, claim.country].filter(Boolean).join(', ') || '—' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- POLICY -->
      <div class="card">
        <div class="card-header">Policy Details</div>
        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Insurer Name</span>
              <span class="info-value">{{ claim.insurer_name || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Policy Number</span>
              <span class="info-value mono">{{ claim.policy_number || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Policy Type</span>
              <span class="info-value">{{ claim.policy_type || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date of Loss</span>
              <span class="info-value">{{ formatDate(claim.date_of_loss) }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { api } from "../utils/api"

const route = useRoute()
const id    = route.params.id as string

const claim   = ref<any>(null)
const loading = ref(true)
const error   = ref("")

onMounted(async () => {
  try {
    const claims = await api.get<any[]>("/api/claims")
    claim.value = claims.find(c => String(c.claim_id) === id) || null
    if (!claim.value) error.value = "Claim not found"
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GB")
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    "New":                  "status-new",
    "FNOL Submitted":       "status-fnol",
    "Under Review":         "status-review",
    "Inspection Scheduled": "status-inspection",
    "Report Ready":         "status-report",
    "Closed":               "status-closed",
  }
  return map[status] || "status-new"
}
</script>

<style scoped>
.claim-detail {
  padding: 28px 32px;
  background: #f1f5f9;
  min-height: 100vh;
  font-family: 'DM Sans', Arial, sans-serif;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.back-link {
  font-size: 12px;
  color: #64748b;
  text-decoration: none;
  display: block;
  margin-bottom: 6px;
}

.back-link:hover { color: #2563eb; }

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

.state-msg {
  text-align: center;
  padding: 60px;
  font-size: 13px;
  color: #94a3b8;
}

.state-error { color: #dc2626; }

.cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  border-bottom: 1px solid #f1f5f9;
}

.card-body {
  padding: 20px 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-full { grid-column: span 2; }

.info-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.info-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  color: #0f172a;
}

.mono { font-family: monospace; }

/* STATUS */
.status-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
}

.status-new        { background: #eff6ff; color: #2563eb; }
.status-fnol       { background: #fefce8; color: #ca8a04; }
.status-review     { background: #fff7ed; color: #ea580c; }
.status-inspection { background: #f0fdf4; color: #16a34a; }
.status-report     { background: #f5f3ff; color: #7c3aed; }
.status-closed     { background: #f1f5f9; color: #64748b; }
</style>
