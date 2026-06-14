<template>
  <div class="prelim">

    <!-- PAGE HEADER -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Preliminary Report</h1>
        <p class="page-subtitle">Auto-filled from claim data — complete remaining fields manually</p>
      </div>
      <div class="header-actions">
        <button @click="saveDraft" class="btn-draft">Save Draft</button>
        <button @click="submitReport" :disabled="isSubmitting" class="btn-submit">
          {{ isSubmitting ? 'Submitting...' : 'Submit Report' }}
        </button>
      </div>
    </div>

    <div v-if="!claimLoaded" class="select-card">
      <label class="field-label">Select Claim *</label>
      <select v-model="selectedClaimId" @change="loadClaimData" class="field-select">
        <option disabled value="">— Select claim —</option>
        <option v-for="c in claims" :key="c.claim_id" :value="c.claim_id">
          {{ c.claim_id }} — {{ c.first_name }} {{ c.last_name }}
        </option>
      </select>
    </div>

    <div v-if="claimLoaded" class="content">

      <!-- SECTION: HEADER INFO -->
      <div class="section-card">
        <div class="section-title">Header Information</div>
        <div class="fields-grid">
          <div class="field-group">
            <label class="field-label">Claim Number <span class="auto-tag">auto</span></label>
            <input :value="auto.claim_id" class="field-input field-auto" readonly />
          </div>
          <div class="field-group">
            <label class="field-label">Policy Number <span class="auto-tag">auto</span></label>
            <input :value="auto.policy_number" class="field-input field-auto" readonly />
          </div>
          <div class="field-group">
            <label class="field-label">Name of Insured <span class="auto-tag">auto</span></label>
            <input :value="auto.insured_name" class="field-input field-auto" readonly />
          </div>
          <div class="field-group">
            <label class="field-label">Date of Loss <span class="auto-tag">auto</span></label>
            <input :value="auto.date_of_loss" class="field-input field-auto" readonly />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Insured Address <span class="auto-tag">auto</span></label>
            <input :value="auto.address" class="field-input field-auto" readonly />
          </div>
          <div class="field-group">
            <label class="field-label">Our Reference</label>
            <input v-model="form.our_reference" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Claims Handler</label>
            <input v-model="form.claims_handler" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Broker</label>
            <input v-model="form.broker" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Public Loss Assessor</label>
            <input v-model="form.public_loss_assessor" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Registration No</label>
            <input v-model="form.registration_no" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">VAT Status of Insured</label>
            <input v-model="form.vat_status" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">VAT to be Deducted</label>
            <select v-model="form.vat_deducted" class="field-select">
              <option value="">Select...</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Situation of Damage</label>
            <input v-model="form.situation_of_damage" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Usage of Building</label>
            <input v-model="form.usage_of_building" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Trade / Occupation</label>
            <input v-model="form.trade_occupation" class="field-input" />
          </div>
        </div>
      </div>

      <!-- SECTION: DATES & CONTACTS -->
      <div class="section-card">
        <div class="section-title">Dates & Contacts</div>
        <div class="fields-grid">
          <div class="field-group">
            <label class="field-label">Day & Date of Loss <span class="auto-tag">auto</span></label>
            <input :value="auto.date_of_loss" class="field-input field-auto" readonly />
          </div>
          <div class="field-group">
            <label class="field-label">Notification Date</label>
            <input v-model="form.notification_date" type="date" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">First Contact</label>
            <input v-model="form.first_contact" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Instruction Date</label>
            <input v-model="form.instruction_date" type="date" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">First Inspection</label>
            <input v-model="form.first_inspection" type="date" class="field-input" />
          </div>
        </div>
      </div>

      <!-- SECTION: INCIDENT -->
      <div class="section-card">
        <div class="section-title">Incident Details</div>
        <div class="fields-grid">
          <div class="field-group">
            <label class="field-label">Point of Origin <span class="auto-tag">auto</span></label>
            <input :value="auto.loss_location" class="field-input field-auto" readonly />
          </div>
          <div class="field-group">
            <label class="field-label">Peril <span class="auto-tag">auto</span></label>
            <input :value="auto.loss_type" class="field-input field-auto" readonly />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Supposed Cause <span class="auto-tag">auto</span></label>
            <textarea :value="auto.detailed_description" class="field-textarea field-auto" readonly rows="2" />
          </div>
          <div class="field-group">
            <label class="field-label">Fire Brigade Attendance</label>
            <select v-model="form.fire_brigade" class="field-select">
              <option value="">Select...</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Policy Application</label>
            <textarea v-model="form.policy_application" class="field-textarea" rows="3" />
          </div>
          <div class="field-group">
            <label class="field-label">Under Insurance</label>
            <input v-model="form.under_insurance" class="field-input" />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Policy Limits</label>
            <textarea v-model="form.policy_limits" class="field-textarea" rows="2" />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Recovery</label>
            <textarea v-model="form.recovery" class="field-textarea" rows="2" />
          </div>
        </div>
      </div>

      <!-- SECTION: FINANCIALS -->
      <div class="section-card">
        <div class="section-title">Financials</div>
        <div class="fields-grid">
          <div class="field-group">
            <label class="field-label">Policy Deductible (€)</label>
            <input v-model="form.policy_deductible" type="number" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Claim Amount (€)</label>
            <input v-model="form.claim_amount" type="number" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Interim Payment (€)</label>
            <input v-model="form.interim_payment" type="number" class="field-input" />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Required from Insurer</label>
            <textarea v-model="form.required_from_insurer" class="field-textarea" rows="2" />
          </div>
        </div>
        <div class="reserve-table-wrap">
          <table class="reserve-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Sums Insured (€)</th>
                <th>Interim Payment (€)</th>
                <th>Previous Payments (€)</th>
                <th>Reserve (€)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="reserve-label">Buildings</td>
                <td><input v-model="form.buildings_sum_insured" type="number" class="table-input" placeholder="0.00" /></td>
                <td><input v-model="form.buildings_interim" type="number" class="table-input" placeholder="0.00" /></td>
                <td><input v-model="form.buildings_previous" type="number" class="table-input" placeholder="0.00" /></td>
                <td><input v-model="form.buildings_reserve" type="number" class="table-input" placeholder="0.00" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION: INVESTIGATION INDICATORS (auto from inspection) -->
      <div class="section-card">
        <div class="section-title">Investigation Indicators <span class="auto-tag">auto from inspection</span></div>
        <div class="indicators-grid">
          <div
            v-for="ind in indicators"
            :key="ind.key"
            class="indicator-item"
            :class="{ flagged: auto.indicators[ind.key] }"
          >
            <div class="indicator-check">
              <svg v-if="auto.indicators[ind.key]" width="10" height="10" viewBox="0 0 12 12">
                <polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
              </svg>
            </div>
            {{ ind.label }}
          </div>
        </div>
      </div>

      <!-- SECTION: CHECKLIST YES/NO -->
      <div class="section-card">
        <div class="section-title">Check List</div>
        <div class="checklist">
          <div class="checklist-header">
            <span class="checklist-num">#</span>
            <span class="checklist-question">Question</span>
            <span class="checklist-answer">Yes / No</span>
          </div>
          <div v-for="item in checklist" :key="item.key" class="checklist-row">
            <span class="checklist-num">{{ item.num }}</span>
            <span class="checklist-question">{{ item.label }}</span>
            <div class="checklist-answer">
              <label class="radio-label">
                <input type="radio" :name="item.key" v-model="form[item.key]" value="yes" /> Yes
              </label>
              <label class="radio-label">
                <input type="radio" :name="item.key" v-model="form[item.key]" value="no" /> No
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION: DOCUMENTS & NOTES -->
      <div class="section-card">
        <div class="section-title">Documentation & Notes</div>
        <div class="fields-grid">
          <div class="field-group col-span-2">
            <label class="field-label">Documentation</label>
            <textarea v-model="form.documentation" class="field-textarea" rows="3" />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Information Points</label>
            <textarea v-model="form.information_points" class="field-textarea" rows="3" />
          </div>
        </div>
      </div>

      <!-- SECTION: NARRATIVE -->
      <div class="section-card">
        <div class="section-title">Report Narrative</div>
        <div class="fields-grid">
          <div class="field-group col-span-2">
            <label class="field-label">Introduction</label>
            <textarea v-model="form.introduction" class="field-textarea" rows="4" />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">The Insured</label>
            <textarea v-model="form.the_insured" class="field-textarea" rows="4" />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Incident and Damage</label>
            <textarea v-model="form.incident_and_damage" class="field-textarea" rows="4" />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Claim Details</label>
            <textarea v-model="form.claim_details" class="field-textarea" rows="4" />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Application of the Policy</label>
            <textarea v-model="form.application_of_policy" class="field-textarea" rows="4" />
          </div>
          <div class="field-group col-span-2">
            <label class="field-label">Next Actions</label>
            <textarea v-model="form.next_actions" class="field-textarea" rows="4" />
          </div>
        </div>
      </div>

    </div>

    <!-- TOAST -->
    <transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { api } from "../utils/api"
import { ref, onMounted } from 'vue'

const claims = ref([])
const selectedClaimId = ref('')
const claimLoaded = ref(false)
const isSubmitting = ref(false)
const toast = ref({ show: false, message: '', type: 'success' })

const auto = ref({
  claim_id: '',
  policy_number: '',
  insured_name: '',
  address: '',
  date_of_loss: '',
  loss_location: '',
  loss_type: '',
  detailed_description: '',
  indicators: {}
})

const form = ref({
  our_reference: '',
  claims_handler: '',
  broker: '',
  situation_of_damage: '',
  usage_of_building: '',
  trade_occupation: '',
  vat_status: '',
  vat_deducted: '',
  public_loss_assessor: '',
  registration_no: '',
  notification_date: '',
  first_contact: '',
  instruction_date: '',
  first_inspection: '',
  fire_brigade: '',
  policy_application: '',
  under_insurance: '',
  policy_limits: '',
  recovery: '',
  policy_deductible: '',
  claim_amount: '',
  interim_payment: '',
  required_from_insurer: '',
  documentation: '',
  information_points: '',
  introduction: '',
  the_insured: '',
  incident_and_damage: '',
  claim_details: '',
  application_of_policy: '',
  next_actions: '',
  buildings_sum_insured: '',
  buildings_interim: '',
  buildings_previous: '',
  buildings_reserve: '',
  chk_inception_after_incident:  '',
  chk_delay_notification:        '',
  chk_insured_unavailable:       '',
  chk_identity_in_doubt:         '',
  chk_loss_method_not_supported: '',
  chk_redundant_dilapidated:     '',
  chk_lack_of_documentation:     '',
  chk_unoccupancy:               '',
  chk_no_police_report:          '',
  chk_suspicious_documentation:  '',
  chk_lack_of_evidence:          '',
  chk_sanction_verification:     '',
})

const checklist = [
  { num: 1,  key: 'chk_inception_after_incident',  label: 'Date of Inception after Incident occurrence' },
  { num: 2,  key: 'chk_delay_notification',         label: 'Delay in notification' },
  { num: 3,  key: 'chk_insured_unavailable',        label: 'Insured unavailable' },
  { num: 4,  key: 'chk_identity_in_doubt',          label: 'Identity of Insured/business in doubt' },
  { num: 5,  key: 'chk_loss_method_not_supported',  label: 'Loss method not supported' },
  { num: 6,  key: 'chk_redundant_dilapidated',      label: 'Redundant goods / Dilapidated property' },
  { num: 7,  key: 'chk_lack_of_documentation',      label: 'Lack of documentation' },
  { num: 8,  key: 'chk_unoccupancy',                label: 'Unoccupancy' },
  { num: 9,  key: 'chk_no_police_report',           label: 'None or inadequate reporting to Police/Garda' },
  { num: 10, key: 'chk_suspicious_documentation',   label: 'Suspicious documentation' },
  { num: 11, key: 'chk_lack_of_evidence',           label: 'Lack of evidence incident occurred' },
  { num: 12, key: 'chk_sanction_verification',      label: 'Matches on Sanction verification tool' },
]

const indicators = [
  { key: 'ind_recent_inception',          label: 'Date of Inception after Incident' },
  { key: 'ind_adverse_loss_history',      label: 'Delay in notification' },
  { key: 'ind_unavailable_interview',     label: 'Insured unavailable' },
  { key: 'ind_identity_in_doubt',         label: 'Identity of Insured in doubt' },
  { key: 'ind_method_not_supportable',    label: 'Loss method not supported' },
  { key: 'ind_dilapidated',               label: 'Redundant goods / Dilapidated property' },
  { key: 'ind_inadequate_documentation',  label: 'Lack of documentation' },
  { key: 'ind_inadequate_cooperation',    label: 'Unoccupancy' },
  { key: 'ind_police_report_delayed',     label: 'None or inadequate reporting to Police' },
  { key: 'ind_detailed_claims_knowledge', label: 'Suspicious documentation' },
  { key: 'ind_claim_withdrawn',           label: 'Lack of evidence incident occurred' },
  { key: 'ind_criminal_convictions',      label: 'Matches on Sanction verification tool' },
]

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3500)
}

const formatDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB')
}

onMounted(async () => {
  claims.value = await api.get('/api/claims')
})

const loadClaimData = async () => {
  if (!selectedClaimId.value) return
  try {
    const all = await api.get('/api/claims')
    const claim = all.find(c => c.claim_id === selectedClaimId.value)
    if (!claim) return

    auto.value.claim_id = claim.claim_id
    auto.value.policy_number = claim.policy_number || ''
    auto.value.insured_name = `${claim.first_name} ${claim.last_name}`
    auto.value.address = [claim.address_line, claim.city, claim.postcode, claim.country].filter(Boolean).join(', ')
    auto.value.date_of_loss = formatDate(claim.date_of_loss)
    auto.value.loss_location = claim.loss_location || ''
    auto.value.loss_type = claim.loss_type || ''
    auto.value.detailed_description = claim.detailed_description || ''

    try {
      const iData = await api.get(`/api/inspections/by-claim/${selectedClaimId.value}`)
      auto.value.indicators = iData.indicators || {}
    } catch (e) {
      auto.value.indicators = {}
    }

    claimLoaded.value = true
  } catch (err) {
    console.error(err)
    showToast('Failed to load claim data', 'error')
  }
}

const saveDraft = () => {
  const data = { claim_id: selectedClaimId.value, status: 'draft', ...form.value }
  localStorage.setItem('prelim_draft_' + selectedClaimId.value, JSON.stringify(data))
  showToast('Draft saved locally', 'success')
}

const submitReport = async () => {
  if (!selectedClaimId.value) {
    showToast('Please select a claim first', 'error')
    return
  }
  isSubmitting.value = true
  try {
    await api.post('/api/preliminary-reports', { claim_id: selectedClaimId.value, ...form.value })
    showToast('Report submitted successfully!', 'success')
  } catch (err) {
    console.error(err)
    showToast('Submission failed. Please try again.', 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.prelim {
  padding: 28px 32px;
  background: #f1f5f9;
  min-height: 100vh;
  font-family: Arial, sans-serif;
  color: #0f172a;
}

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

.header-actions { display: flex; gap: 10px; }

.btn-draft {
  padding: 8px 18px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #0f172a;
  font-size: 13px;
  cursor: pointer;
}

.btn-draft:hover { background: #f8fafc; }

.btn-submit {
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:hover:not(:disabled) { background: #1d4ed8; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.select-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 24px;
  max-width: 480px;
}

.content { display: flex; flex-direction: column; gap: 20px; }

.section-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.section-title {
  padding: 14px 24px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #475569;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px 24px;
  column-gap: 20px;
}

.col-span-2 { grid-column: span 2; }

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.auto-tag {
  font-size: 10px;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 1px 5px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.field-input,
.field-select,
.field-textarea {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  font-family: Arial, sans-serif;
  color: #0f172a;
  background: #fff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field-input:focus,
.field-select:focus,
.field-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}

.field-auto {
  background: #f8fafc;
  color: #64748b;
  cursor: default;
}

.field-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.reserve-table-wrap {
  margin: 0 24px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.reserve-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.reserve-table th {
  background: #f8fafc;
  padding: 9px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

.reserve-table td { padding: 6px 8px; }

.reserve-label {
  padding: 8px 14px;
  font-weight: 600;
  color: #0f172a;
}

.table-input {
  width: 100%;
  border: none;
  padding: 6px 8px;
  font-size: 13px;
  font-family: Arial, sans-serif;
  background: transparent;
  outline: none;
  color: #0f172a;
}

.table-input:focus { background: #eff6ff; border-radius: 4px; }

.indicators-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 16px 24px 20px;
}

.indicator-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  color: #64748b;
}

.indicator-item.flagged {
  border-color: #ef4444;
  background: #fef2f2;
  color: #991b1b;
}

.indicator-check {
  width: 16px;
  height: 16px;
  border: 1.5px solid #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.indicator-item.flagged .indicator-check {
  background: #ef4444;
  border-color: #ef4444;
  color: #fff;
}

/* CHECKLIST */
.checklist { padding: 4px 24px 20px; }

.checklist-header {
  display: grid;
  grid-template-columns: 36px 1fr 180px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 4px;
}

.checklist-row {
  display: grid;
  grid-template-columns: 36px 1fr 180px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  color: #0f172a;
}

.checklist-row:last-child { border-bottom: none; }
.checklist-row:hover { background: #f8fafc; border-radius: 6px; }

.checklist-num {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
}

.checklist-question { color: #0f172a; }

.checklist-answer {
  display: flex;
  gap: 20px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  cursor: pointer;
  color: #0f172a;
}

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 11px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.toast.success { background: #16a34a; color: #fff; }
.toast.error   { background: #ef4444; color: #fff; }

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px); }
</style>