<template>
  <div class="claims-page">

    <!-- HEADER -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Claims</h1>
        <p class="page-subtitle">All registered insurance claims</p>
      </div>
      <router-link to="/create-claim" class="btn-primary">+ New Claim</router-link>
    </div>

    <!-- SEARCH -->
    <div class="toolbar">
      <input
        v-model="search"
        class="search-input"
        placeholder="Search by name, policy number, insurer..."
      />
      <span class="results-count">{{ filteredClaims.length }} claims</span>
    </div>

    <!-- TABLE -->
    <div class="table-card">
      <div v-if="loading" class="state-msg">Loading...</div>
      <div v-else-if="error" class="state-msg state-error">{{ error }}</div>
      <div v-else-if="filteredClaims.length === 0" class="state-msg">No claims found.</div>

      <table v-else class="claims-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Claimant</th>
            <th>Insurer</th>
            <th>Policy No.</th>
            <th>Type</th>
            <th>Date of Loss</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="claim in paginated" :key="claim.claim_id">
            <td class="td-id">{{ claim.claim_id }}</td>
            <td class="td-name">{{ claim.first_name }} {{ claim.last_name }}</td>
            <td>{{ claim.insurer_name }}</td>
            <td class="td-mono">{{ claim.policy_number }}</td>
            <td>{{ claim.policy_type || '—' }}</td>
            <td>{{ formatDate(claim.date_of_loss) }}</td>
            <td><span :class="['status-badge', statusClass(claim.claim_status)]">{{ claim.claim_status }}</span></td>
            <td>
              <router-link :to="`/claims/${claim.claim_id}`" class="btn-view">View</router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PAGINATION -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">←</button>
      <button
        v-for="p in totalPages"
        :key="p"
        class="page-btn"
        :class="{ active: p === currentPage }"
        @click="currentPage = p"
      >{{ p }}</button>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">→</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { api } from "../utils/api"

const claims   = ref<any[]>([])
const loading  = ref(true)
const error    = ref("")
const search   = ref("")
const currentPage = ref(1)
const PER_PAGE = 15

onMounted(async () => {
  try {
    claims.value = await api.get("/api/claims")
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})

const filteredClaims = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return claims.value
  return claims.value.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
    (c.policy_number || "").toLowerCase().includes(q) ||
    (c.insurer_name  || "").toLowerCase().includes(q) ||
    (c.policy_type   || "").toLowerCase().includes(q)
  )
})

const totalPages = computed(() => Math.ceil(filteredClaims.value.length / PER_PAGE))

const paginated = computed(() => {
  const start = (currentPage.value - 1) * PER_PAGE
  return filteredClaims.value.slice(start, start + PER_PAGE)
})

// Reset to page 1 when search changes
watch(search, () => { currentPage.value = 1 })

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
.claims-page {
  padding: 28px 32px;
  background: #f1f5f9;
  min-height: 100vh;
  font-family: 'DM Sans', Arial, sans-serif;
}

/* HEADER */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
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

.btn-primary {
  padding: 8px 18px;
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.btn-primary:hover { background: #1d4ed8; }

/* TOOLBAR */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #0f172a;
  outline: none;
  width: 300px;
  font-family: inherit;
  background: #fff;
}

.search-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}

.results-count {
  font-size: 12px;
  color: #94a3b8;
}

/* TABLE CARD */
.table-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.state-msg {
  padding: 40px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
}

.state-error { color: #dc2626; }

.claims-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.claims-table th {
  padding: 11px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.claims-table td {
  padding: 12px 16px;
  color: #0f172a;
  border-bottom: 1px solid #f1f5f9;
}

.claims-table tbody tr:last-child td { border-bottom: none; }
.claims-table tbody tr:hover { background: #f8fafc; }

.td-id   { color: #94a3b8; font-size: 12px; }
.td-name { font-weight: 600; }
.td-mono { font-family: monospace; font-size: 12px; color: #475569; }

/* STATUS BADGES */
.status-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.status-new        { background: #eff6ff; color: #2563eb; }
.status-fnol       { background: #fefce8; color: #ca8a04; }
.status-review     { background: #fff7ed; color: #ea580c; }
.status-inspection { background: #f0fdf4; color: #16a34a; }
.status-report     { background: #f5f3ff; color: #7c3aed; }
.status-closed     { background: #f1f5f9; color: #64748b; }

/* VIEW BUTTON */
.btn-view {
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  font-size: 12px;
  color: #475569;
  text-decoration: none;
  font-weight: 500;
}

.btn-view:hover { border-color: #2563eb; color: #2563eb; }

/* PAGINATION */
.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 16px;
  justify-content: center;
}

.page-btn {
  padding: 6px 11px;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  background: #fff;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
}

.page-btn:hover:not(:disabled) { border-color: #2563eb; color: #2563eb; }
.page-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
