<template>
  <div class="dashboard">

    <!-- HEADER -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Claims Dashboard</h1>
        <p class="page-subtitle">Overview of all insurance claim activity</p>
      </div>
      <input v-model="search" placeholder="Quick search..." class="search-input" />
    </div>

    <!-- STAT CARDS -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-body">
          <p class="stat-label">Total Claims</p>
          <h2 class="stat-value">{{ total }}</h2>
        </div>
        <div class="stat-icon">
          <FileText class="w-5 h-5" />
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-body">
          <p class="stat-label">Open</p>
          <h2 class="stat-value">{{ open }}</h2>
        </div>
        <div class="stat-icon">
          <Clock class="w-5 h-5" />
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-body">
          <p class="stat-label">Investigation</p>
          <h2 class="stat-value">{{ investigation }}</h2>
        </div>
        <div class="stat-icon">
          <Search class="w-5 h-5" />
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-body">
          <p class="stat-label">Closed</p>
          <h2 class="stat-value">{{ closed }}</h2>
        </div>
        <div class="stat-icon">
          <CheckCircle class="w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- TABLE SECTION -->
    <div class="table-card">
      <div class="table-header">
        <div>
          <h2 class="table-title">Recent Claims</h2>
          <p class="table-subtitle">Manage and review submitted insurance claims.</p>
        </div>
      </div>

      <table class="claims-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Policy</th>
            <th>Insurer</th>
            <th>Date of Loss</th>
            <th>Status</th>
            <th style="text-align:center">FNOL</th>
            <th style="text-align:center">Inspection</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filteredClaims" :key="c.claim_id">
            <td>
              <div class="client-cell">
                <div class="avatar">{{ initials(c.first_name, c.last_name) }}</div>
                <div>
                  <div class="client-name">{{ c.first_name }} {{ c.last_name }}</div>
                </div>
              </div>
            </td>
            <td class="text-muted">{{ c.email }}</td>
            <td>{{ c.policy_number }}</td>
            <td>{{ c.insurer_name }}</td>
            <td class="text-muted">{{ formatDate(c.date_of_loss) }}</td>
            <td>
              <span class="status-badge" :class="'status-' + c.claim_status">
                {{ c.claim_status }}
              </span>
            </td>
            <td style="text-align:center">
              <span class="fnol-badge" :class="c.fnol_id ? 'fnol-yes' : 'fnol-no'">
                {{ c.fnol_id ? 'YES' : 'NO' }}
              </span>
            </td>
            <td style="text-align:center">
              <span class="fnol-badge" :class="c.inspection_id ? 'fnol-yes' : 'fnol-no'">
                {{ c.inspection_id ? 'YES' : 'NO' }}
              </span>
            </td>
            <td class="menu-cell">
              <div @click.stop="toggleMenu(c.claim_id)" class="menu-btn">
                <MoreVertical class="w-4 h-4" />
              </div>
              <div v-if="activeMenu === c.claim_id" class="dropdown">
                <div @click="openModal(c)" class="dropdown-item">
                  <Info class="w-4 h-4" /> Information
                </div>
                <div @click="openEdit(c)" class="dropdown-item">
                  Edit
                </div>
                <div @click="downloadDoc(c.claim_id)" class="dropdown-item">
                  Download Claim
                </div>
                <div v-if="c.inspection_id" @click="downloadInspectionDoc(c.inspection_id)" class="dropdown-item">
                  Download Inspection
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- INFO MODAL -->
    <div v-if="selectedClaim" @click="selectedClaim = null" class="modal-overlay">
      <div @click.stop class="modal">
        <h2 class="modal-title">Full Claim Information</h2>
        <div class="modal-grid">
          <div><span class="modal-label">First Name</span><p>{{ selectedClaim.first_name }}</p></div>
          <div><span class="modal-label">Last Name</span><p>{{ selectedClaim.last_name }}</p></div>
          <div><span class="modal-label">Date of Birth</span><p>{{ formatDate(selectedClaim.date_of_birth) }}</p></div>
          <div><span class="modal-label">Phone</span><p>{{ selectedClaim.phone }}</p></div>
          <div class="col-span-2"><span class="modal-label">Email</span><p>{{ selectedClaim.email }}</p></div>
          <div class="col-span-2"><span class="modal-label">Address</span><p>{{ selectedClaim.address_line }}, {{ selectedClaim.city }}, {{ selectedClaim.postcode }}, {{ selectedClaim.country }}</p></div>
          <div><span class="modal-label">Insurer</span><p>{{ selectedClaim.insurer_name }}</p></div>
          <div><span class="modal-label">Policy Number</span><p>{{ selectedClaim.policy_number }}</p></div>
          <div><span class="modal-label">Policy Type</span><p>{{ selectedClaim.policy_type }}</p></div>
          <div><span class="modal-label">Date of Loss</span><p>{{ formatDate(selectedClaim.date_of_loss) }}</p></div>
          <div><span class="modal-label">Status</span><p>{{ selectedClaim.claim_status }}</p></div>
        </div>
        <div class="modal-footer">
          <button @click="selectedClaim = null" class="btn-close">Close</button>
        </div>
      </div>
    </div>

    <!-- EDIT MODAL -->
    <div v-if="isEditMode && editClaim" @click="isEditMode = false" class="modal-overlay">
      <div @click.stop class="modal">
        <h2 class="modal-title">Edit Claim</h2>
        <div class="modal-grid">
          <div><label class="modal-label">First Name</label><input v-model="editClaim.first_name" class="modal-input" /></div>
          <div><label class="modal-label">Last Name</label><input v-model="editClaim.last_name" class="modal-input" /></div>
          <div><label class="modal-label">Date of Birth</label><input ref="dateBirthEditRef" class="modal-input" placeholder="Date of Birth" /></div>
          <div><label class="modal-label">Phone</label><input v-model="editClaim.phone" class="modal-input" /></div>
          <div class="col-span-2"><label class="modal-label">Email</label><input v-model="editClaim.email" class="modal-input" /></div>
          <div class="col-span-2"><label class="modal-label">Address</label><input v-model="editClaim.address_line" class="modal-input" /></div>
          <div><label class="modal-label">City</label><input v-model="editClaim.city" class="modal-input" /></div>
          <div><label class="modal-label">Postcode</label><input v-model="editClaim.postcode" class="modal-input" /></div>
          <div><label class="modal-label">Country</label><input v-model="editClaim.country" class="modal-input" /></div>
          <div><label class="modal-label">Insurer</label><input v-model="editClaim.insurer_name" class="modal-input" /></div>
          <div><label class="modal-label">Policy Number</label><input v-model="editClaim.policy_number" class="modal-input" /></div>
          <div><label class="modal-label">Policy Type</label><input v-model="editClaim.policy_type" class="modal-input" /></div>
          <div><label class="modal-label">Date of Loss</label><input ref="dateLossEditRef" class="modal-input" placeholder="Date of Loss" /></div>
          <div><label class="modal-label">Status</label>
            <select v-model="editClaim.claim_status" class="modal-input">
              <option>open</option>
              <option>investigation</option>
              <option>closed</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="isEditMode = false" class="btn-close">Cancel</button>
          <button @click="saveClaim" class="btn-save">Save</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { api, downloadFile } from "../utils/api"
import { ref, onMounted, computed } from "vue"
import { MoreVertical, Info, FileText, Clock, Search, CheckCircle } from "lucide-vue-next"
import { nextTick } from "vue"
import flatpickr from "flatpickr"

interface Claim {
  claim_id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  address_line: string
  city: string
  postcode: string
  country: string
  insurer_name: string
  policy_number: string
  policy_type: string
  date_of_loss: string
  claim_status: string
  fnol_id: number | null
  inspection_id: number | null
  [key: string]: any
}

const dateBirthEditRef = ref<HTMLElement | null>(null)
const dateLossEditRef = ref<HTMLElement | null>(null)

const claims = ref<Claim[]>([])
const total = ref(0)
const open = ref(0)
const investigation = ref(0)
const closed = ref(0)
const search = ref("")

const activeMenu = ref<number | null>(null)
const selectedClaim = ref<Claim | null>(null)
const isEditMode = ref(false)
const editClaim = ref<Claim | null>(null)

const formatDate = (date: string | null | undefined): string => {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-GB")
}

const initials = (first, last) => {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase()
}

const toggleMenu = (id) => {
  activeMenu.value = activeMenu.value === id ? null : id
}

const openModal = (claim) => {
  selectedClaim.value = claim
  activeMenu.value = null
}

const openEdit = async (claim) => {
  editClaim.value = { ...claim }
  isEditMode.value = true
  activeMenu.value = null
  await nextTick()
  flatpickr(dateBirthEditRef.value, {
    dateFormat: "Y-m-d",
    defaultDate: editClaim.value.date_of_birth,
    onChange: (_, dateStr) => { editClaim.value.date_of_birth = dateStr }
  })
  flatpickr(dateLossEditRef.value, {
    dateFormat: "Y-m-d",
    defaultDate: editClaim.value.date_of_loss,
    onChange: (_, dateStr) => { editClaim.value.date_of_loss = dateStr }
  })
}

const recalcStats = () => {
  total.value = claims.value.length
  open.value = claims.value.filter(c => c.claim_status === "open").length
  investigation.value = claims.value.filter(c => c.claim_status === "investigation").length
  closed.value = claims.value.filter(c => c.claim_status === "closed").length
}

const filteredClaims = computed(() => {
  if (!search.value) return claims.value
  return claims.value.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email} ${c.policy_number} ${c.insurer_name}`
      .toLowerCase().includes(search.value.toLowerCase())
  )
})

onMounted(async () => {
  document.addEventListener("click", () => { activeMenu.value = null })
  try {
    const data = await api.get("/api/claims")
    claims.value = data
    recalcStats()
  } catch {
    // 401 → api.ts автоматически редиректит на /login
  }
})

const saveClaim = async () => {
  try {
    await api.put(`/api/claims/${editClaim.value.claim_id}`, editClaim.value)
    const index = claims.value.findIndex(c => c.claim_id === editClaim.value.claim_id)
    if (index !== -1) claims.value[index] = { ...editClaim.value }
    recalcStats()
    isEditMode.value = false
    editClaim.value = null
  } catch (err) {
    console.error("Save failed:", err)
  }
}

const downloadDoc = async (id) => {
  await downloadFile(`/api/claims/${id}/doc`, `claim_${id}.docx`)
}

const downloadInspectionDoc = async (inspectionId) => {
  await downloadFile(`/api/inspections/${inspectionId}/doc`, `inspection_${inspectionId}.docx`)
}
</script>

<style scoped>
.dashboard {
  padding: 28px 32px;
  background: #f1f5f9;
  min-height: 100vh;
  font-family: 'DM Sans', Arial, sans-serif;
}

/* HEADER */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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

.search-input {
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  width: 220px;
  background: #fff;
  color: #0f172a;
  outline: none;
}

.search-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}

/* STATS */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 6px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.stat-icon {
  color: #94a3b8;
  margin-top: 2px;
}

/* TABLE */
.table-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  padding: 18px 24px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.table-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 2px;
}

.table-subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.claims-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.claims-table th {
  padding: 10px 16px;
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
  border-bottom: 1px solid #f1f5f9;
  color: #0f172a;
}

.claims-table tr:last-child td { border-bottom: none; }
.claims-table tr:hover td { background: #f8fafc; }

.text-muted { color: #64748b; }

/* AVATAR + CLIENT */
.client-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.client-name {
  font-weight: 600;
  color: #0f172a;
}

/* BADGES */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  text-transform: capitalize;
}

.status-open { color: #2563eb; background: #eff6ff; border-color: #bfdbfe; }
.status-investigation { color: #d97706; background: #fffbeb; border-color: #fde68a; }
.status-closed { color: #16a34a; background: #f0fdf4; border-color: #bbf7d0; }

.fnol-badge {
  font-size: 12px;
  font-weight: 700;
}
.fnol-yes { color: #16a34a; }
.fnol-no  { color: #ef4444; }

/* MENU */
.menu-cell { position: relative; text-align: center; }

.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  color: #94a3b8;
}

.menu-btn:hover { background: #f1f5f9; color: #0f172a; }

.dropdown {
  position: absolute;
  right: 8px;
  top: 36px;
  width: 160px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  z-index: 10;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
}

.dropdown-item:hover { background: #f8fafc; }

/* MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 10px;
  width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px;
}

.modal-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 20px;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 20px;
}

.col-span-2 { grid-column: span 2; }

.modal-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 4px;
}

.modal-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #0f172a;
  background: #fff;
  outline: none;
  font-family: inherit;
}

.modal-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
}

.btn-close {
  padding: 8px 18px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #0f172a;
  font-size: 13px;
  cursor: pointer;
}

.btn-close:hover { background: #f8fafc; }

.btn-save {
  padding: 8px 18px;
  border-radius: 6px;
  border: none;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:hover { background: #1d4ed8; }
</style>