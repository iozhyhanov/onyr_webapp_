<template>
  <div class="inspection-shell">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor" opacity="0.9"/>
            <rect x="11" y="2" width="7" height="7" rx="1" fill="currentColor" opacity="0.5"/>
            <rect x="2" y="11" width="7" height="7" rx="1" fill="currentColor" opacity="0.5"/>
            <rect x="11" y="11" width="7" height="7" rx="1" fill="currentColor" opacity="0.9"/>
          </svg>
          Inspection
        </div>
        <div class="claim-badge" v-if="selectedClaimId">
          Claim {{ selectedClaimId }}
        </div>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="(sec, i) in sections"
          :key="i"
          class="nav-item"
          :class="{ active: currentSection === i, done: sectionDone(i) }"
          @click="currentSection = i"
        >
          <span class="nav-num">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="nav-label">{{ sec.label }}</span>
          <svg v-if="sectionDone(i)" class="nav-check" width="12" height="12" viewBox="0 0 12 12">
            <polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="progress-label">{{ completedCount }} / {{ sections.length }} sections</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <button class="btn-draft" @click="saveDraft">Save Draft</button>
        <button class="btn-submit" @click="submitInspection" :disabled="isSubmitting">
          {{ isSubmitting ? 'Submitting...' : 'Submit Report' }}
        </button>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="main-content">
      <div class="section-wrapper">

        <!-- SECTION HEADER -->
        <div class="section-topbar">
          <div class="section-meta">
            <h1 class="section-title">{{ sections[currentSection].label }}</h1>
          </div>
          <div class="section-nav-btns">
            <button class="btn-prev" :disabled="currentSection === 0" @click="currentSection--">
              ← Prev
            </button>
            <button class="btn-next" :disabled="currentSection === sections.length - 1" @click="currentSection++">
              Next →
            </button>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 0: CLAIM & BASIC INFO             -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 0" class="fields-grid">
          <div class="field-group col-span-2">
            <label>Select Claim *</label>
            <select v-model="selectedClaimId" class="field-select">
              <option disabled value="">— Select claim —</option>
              <option v-for="c in claims" :key="c.claim_id" :value="c.claim_id">
                {{ c.claim_id }} — {{ c.first_name }} {{ c.last_name }}
              </option>
            </select>
          </div>

          <div class="field-group">
            <label>File Number</label>
            <input v-model="form.header.file_number" class="field-input" placeholder="e.g. DB-2024-001"/>
          </div>
          <div class="field-group">
            <label>Date</label>
            <input v-model="form.header.date" v-datepicker class="field-input"/>
          </div>
          <div class="field-group">
            <label>Date of Incident</label>
            <input v-model="form.header.date_of_incident" v-datepicker class="field-input"/>
          </div>
          <div class="field-group">
            <label>Policy Number</label>
            <input v-model="form.header.policy_number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Claim Number</label>
            <input v-model="form.header.claim_number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Type of Case</label>
            <input v-model="form.header.type_of_case" class="field-input" placeholder="e.g. Domestic Property"/>
          </div>

          <div class="divider col-span-2"><span>Claimant</span></div>

          <div class="field-group">
            <label>Name of Claimant</label>
            <input v-model="form.header.claimant_name" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Contact Number</label>
            <input v-model="form.header.claimant_phone" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Email</label>
            <input v-model="form.header.claimant_email" type="email" class="field-input"/>
          </div>

          <div class="divider col-span-2"><span>Insurer</span></div>

          <div class="field-group">
            <label>Name of Insurer</label>
            <input v-model="form.header.insurer_name" class="field-input"/>
          </div>
          <div class="field-group">
            <label>If Other (Insurer)</label>
            <input v-model="form.header.insurer_other" class="field-input"/>
          </div>

          <div class="divider col-span-2"><span>Other Representative</span></div>

          <div class="field-group col-span-2">
            <label>Other Representative</label>
            <input v-model="form.header.other_rep" class="field-input" placeholder="Name / organisation"/>
          </div>
          <div class="field-group">
            <label>Rep Email</label>
            <input v-model="form.header.other_rep_email" type="email" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Rep Contact Number</label>
            <input v-model="form.header.other_rep_phone" class="field-input"/>
          </div>

          <div class="divider col-span-2"><span>Loss</span></div>

          <div class="field-group">
            <label>Type of Loss</label>
            <input v-model="form.header.type_of_loss" class="field-input" placeholder="e.g. Water Damage, Theft"/>
          </div>
          <div class="field-group col-span-2">
            <label>Details of Loss</label>
            <textarea v-model="form.header.details_of_loss" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group">
            <label>Inspection Date</label>
            <input v-model="form.header.inspection_date" v-datepicker class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Other Information</label>
            <textarea v-model="form.header.other_info" class="field-textarea" rows="2"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 1: SITE VISIT INFO                -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 1" class="fields-grid">
          <div class="field-group">
            <label>Devon Bay Incident Ref</label>
            <input v-model="form.site.incident_ref" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Field Adjuster</label>
            <input v-model="form.site.field_adjuster" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Internal Adjuster</label>
            <input v-model="form.site.internal_adjuster" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Visit Date</label>
            <input v-model="form.site.visit_date" v-datepicker class="field-input"/>
          </div>
          <div class="field-group">
            <label>Visit Time</label>
            <input v-model="form.site.visit_time" type="time" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Persons Present</label>
            <input v-model="form.site.persons_present" class="field-input" placeholder="Names of everyone present at visit"/>
          </div>
          <div class="field-group">
            <label>Contact Numbers</label>
            <input v-model="form.site.contact_numbers" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Email Address</label>
            <input v-model="form.site.email" type="email" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>GDPR Form Obtained</label>
            <div class="radio-row">
              <label class="radio-label"><input type="radio" v-model="form.site.gdpr_obtained" value="yes"/> Yes</label>
              <label class="radio-label"><input type="radio" v-model="form.site.gdpr_obtained" value="no"/> No</label>
            </div>
            <input v-if="form.site.gdpr_obtained === 'no'" v-model="form.site.gdpr_reason" class="field-input mt-2" placeholder="Reason not obtained…"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes</label>
            <textarea v-model="form.site.adjuster_notes" class="field-textarea" rows="4"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 2: THE INSURED                    -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 2" class="fields-grid">
          <div class="field-group col-span-2">
            <label>Policyholder Name &amp; DOB</label>
            <input v-model="form.insured.policyholder_name_dob" class="field-input" placeholder="Full name, DOB"/>
          </div>
          <div class="field-group col-span-2">
            <label>Policyholder Occupation</label>
            <input v-model="form.insured.occupation" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Policyholders Address</label>
            <textarea v-model="form.insured.address" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group">
            <label>Period of Residence</label>
            <input v-model="form.insured.period_of_residence" class="field-input" placeholder="e.g. 5 years"/>
          </div>
          <div class="field-group col-span-2">
            <label>Previous Addresses (last 5 years)</label>
            <textarea v-model="form.insured.previous_addresses" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group">
            <label>Period on Cover</label>
            <input v-model="form.insured.period_on_cover" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Previous Insurers (last 3 years)</label>
            <input v-model="form.insured.previous_insurers" class="field-input"/>
          </div>

          <div class="divider col-span-2"><span>Previous Claims</span></div>

          <div class="field-group col-span-2" v-for="n in 3" :key="'claim'+n">
            <label>Claim {{ n }} — Date / Cause / Value / Insurer</label>
            <input v-model="form.insured.previous_claims[n-1]" class="field-input"/>
          </div>

          <div class="divider col-span-2"><span>Background</span></div>

          <div class="field-group col-span-2">
            <label>Convictions / CCJs / Bankruptcy</label>
            <textarea v-model="form.insured.convictions" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group col-span-2">
            <label>Other Occupiers (Name / DOB / Relationship / Convictions)</label>
            <textarea v-model="form.insured.other_occupiers" class="field-textarea" rows="4"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes</label>
            <textarea v-model="form.insured.adjuster_notes" class="field-textarea" rows="4"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 3: THE PREMISES                   -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 3" class="fields-grid">
          <div class="field-group col-span-2">
            <label>Type of Property &amp; Nature of Construction</label>
            <input v-model="form.premises.property_type" class="field-input" placeholder="e.g. Semi-detached, brick construction"/>
          </div>
          <div class="field-group">
            <label>Number of Storeys</label>
            <input v-model="form.premises.storeys" type="number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Number of Bedrooms</label>
            <input v-model="form.premises.bedrooms" type="number" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Roof Construction (Style / Covering / Condition)</label>
            <textarea v-model="form.premises.roof" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group col-span-2">
            <label>Basement / Attic / Outbuildings</label>
            <input v-model="form.premises.basement_attic" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Date of Construction</label>
            <input v-model="form.premises.date_of_construction" class="field-input" placeholder="e.g. 1965"/>
          </div>
          <div class="field-group">
            <label>Listing Status</label>
            <select v-model="form.premises.listing_status" class="field-select">
              <option value="">Select…</option>
              <option>Not Listed</option>
              <option>Conservation Area</option>
              <option>Grade I</option>
              <option>Grade II</option>
            </select>
          </div>
          <div class="field-group col-span-2">
            <label>Standard of Maintenance</label>
            <textarea v-model="form.premises.maintenance_standard" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group col-span-2">
            <label>Ownership Status (Mortgaged / Tenanted / Leased / Other)</label>
            <textarea v-model="form.premises.ownership_status" class="field-textarea" rows="2" placeholder="Include landlord details if applicable"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 4: PROTECTIONS                    -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 4" class="fields-grid">
          <div class="divider col-span-2"><span>Doors</span></div>

          <template v-for="door in ['front_door','rear_door','side_door','french_door','patio_conservatory']" :key="door">
            <div class="field-group">
              <label>{{ doorLabel(door) }} — Lock Make</label>
              <input v-model="form.protections[door].lock_make" class="field-input"/>
            </div>
            <div class="field-group">
              <label>{{ doorLabel(door) }} — Lock Type</label>
              <select v-model="form.protections[door].lock_type" class="field-select">
                <option value="">Select…</option>
                <option>Rim lock</option>
                <option>Latch</option>
                <option>Tower bolt</option>
                <option>Mortice</option>
                <option>Other</option>
              </select>
            </div>
          </template>

          <div class="divider col-span-2"><span>Windows</span></div>

          <template v-for="side in ['front','side','rear']" :key="'win'+side">
            <div class="field-group">
              <label>{{ capitalize(side) }} Windows</label>
              <input v-model="form.protections.windows[side]" class="field-input" placeholder="Description"/>
            </div>
            <div class="field-group">
              <label>{{ capitalize(side) }} Window Locks</label>
              <input v-model="form.protections.windows[side+'_locks']" class="field-input"/>
            </div>
          </template>

          <div class="divider col-span-2"><span>Alarm</span></div>

          <div class="field-group col-span-2">
            <label>Alarm Details (Sensor type / Installer / Monitored / Police link)</label>
            <textarea v-model="form.protections.alarm_details" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Recommendations (Doors / Windows / Alarm / Other)</label>
            <textarea v-model="form.protections.recommendations" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Presentation of Risk Issues &amp; Concerns</label>
            <textarea v-model="form.protections.risk_issues" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Warranties &amp; Conditions Complied With</label>
            <div class="radio-row">
              <label class="radio-label"><input type="radio" v-model="form.protections.warranties_complied" value="yes"/> Yes</label>
              <label class="radio-label"><input type="radio" v-model="form.protections.warranties_complied" value="no"/> No</label>
            </div>
            <textarea v-if="form.protections.warranties_complied === 'no'" v-model="form.protections.warranties_notes" class="field-textarea mt-2" rows="2" placeholder="Details of non-compliance…"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes</label>
            <textarea v-model="form.protections.adjuster_notes" class="field-textarea" rows="4"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 5: DISCOVERY & PERILS             -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 5" class="fields-grid">
          <div class="field-group">
            <label>Date &amp; Time Damage Discovered</label>
            <input v-model="form.discovery.discovered_datetime" v-datetimepicker class="field-input"/>
          </div>
          <div class="field-group">
            <label>Who Discovered the Damage</label>
            <input v-model="form.discovery.discovered_by" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>When Was Property Last Occupied and by Whom</label>
            <input v-model="form.discovery.last_occupied" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Operating Peril</label>
            <input v-model="form.discovery.operating_peril" class="field-input" placeholder="e.g. Storm, Escape of water, Theft"/>
          </div>
          <div class="field-group col-span-2">
            <label>Circumstances of Loss</label>
            <textarea v-model="form.discovery.circumstances" class="field-textarea" rows="4"/>
          </div>
          <div class="field-group col-span-2">
            <label>Issues of Causation to be Resolved (How &amp; Who)</label>
            <textarea v-model="form.discovery.causation_issues" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Evidence Available (Weather records / Invoices / Witnesses)</label>
            <textarea v-model="form.discovery.evidence" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes</label>
            <textarea v-model="form.discovery.adjuster_notes" class="field-textarea" rows="4"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 6: THEFT / MALICIOUS DAMAGE       -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 6" class="fields-grid">
          <div class="field-group col-span-2">
            <label>Where Were Occupants Prior to &amp; at Time of Loss</label>
            <textarea v-model="form.theft.occupants_prior" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group col-span-2">
            <label>Who Was Last to Leave and When</label>
            <input v-model="form.theft.last_to_leave" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Was Property Fully Secured and by Whom</label>
            <input v-model="form.theft.fully_secured" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Method of Entry</label>
            <textarea v-model="form.theft.method_of_entry" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group col-span-2">
            <label>Method of Exit</label>
            <textarea v-model="form.theft.method_of_exit" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group col-span-2">
            <label>Evidence of Force Used</label>
            <div class="radio-row">
              <label class="radio-label"><input type="radio" v-model="form.theft.force_evidence" value="yes"/> Yes</label>
              <label class="radio-label"><input type="radio" v-model="form.theft.force_evidence" value="no"/> No</label>
            </div>
            <p class="field-hint">Take photos if yes</p>
          </div>
          <div class="field-group">
            <label>CRN / Incident Number</label>
            <input v-model="form.theft.crn" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Police Station Name &amp; Address</label>
            <textarea v-model="form.theft.police_station" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group col-span-2">
            <label>Police Report Required / Requested</label>
            <div class="radio-row">
              <label class="radio-label"><input type="radio" v-model="form.theft.police_report_required" value="yes"/> Yes</label>
              <label class="radio-label"><input type="radio" v-model="form.theft.police_report_required" value="no"/> No</label>
            </div>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes</label>
            <textarea v-model="form.theft.adjuster_notes" class="field-textarea" rows="4"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 7: BUILDINGS (FNQ)                -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 7" class="fields-grid">
          <div class="col-span-2">
            <label class="field-label-standalone">Damaged Areas</label>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Area / Room</th>
                    <th>Length</th>
                    <th>Width</th>
                    <th>Height</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in form.buildings.damaged_areas" :key="i">
                    <td><input v-model="row.area" class="table-input"/></td>
                    <td><input v-model="row.length" class="table-input" placeholder="m"/></td>
                    <td><input v-model="row.width" class="table-input" placeholder="m"/></td>
                    <td><input v-model="row.height" class="table-input" placeholder="m"/></td>
                    <td><button class="btn-remove" @click="form.buildings.damaged_areas.splice(i,1)">✕</button></td>
                  </tr>
                </tbody>
              </table>
              <button class="btn-add-row" @click="form.buildings.damaged_areas.push({area:'',length:'',width:'',height:''})">
                + Add Row
              </button>
            </div>
          </div>

          <div class="col-span-2">
            <label class="field-label-standalone">Room — Nature of Damage &amp; Required Repairs</label>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width:200px">Room</th>
                    <th>Nature of Damage &amp; Required Repairs</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in form.buildings.room_damage" :key="i">
                    <td><input v-model="row.room" class="table-input"/></td>
                    <td><input v-model="row.damage" class="table-input"/></td>
                    <td><button class="btn-remove" @click="form.buildings.room_damage.splice(i,1)">✕</button></td>
                  </tr>
                </tbody>
              </table>
              <button class="btn-add-row" @click="form.buildings.room_damage.push({room:'',damage:''})">
                + Add Row
              </button>
            </div>
          </div>

          <div class="field-group col-span-2">
            <label>Is All Damage Consistent with Insured Peril?</label>
            <div class="radio-row">
              <label class="radio-label"><input type="radio" v-model="form.buildings.damage_consistent" value="yes"/> Yes</label>
              <label class="radio-label"><input type="radio" v-model="form.buildings.damage_consistent" value="no"/> No</label>
              <label class="radio-label"><input type="radio" v-model="form.buildings.damage_consistent" value="partial"/> Partial</label>
            </div>
          </div>
          <div class="field-group col-span-2">
            <label>Areas of Betterment</label>
            <textarea v-model="form.buildings.betterment" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group col-span-2">
            <label>Areas of Maintenance</label>
            <textarea v-model="form.buildings.maintenance" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group col-span-2">
            <label>Actions to Finalise Quantum</label>
            <textarea v-model="form.buildings.actions_quantum" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes</label>
            <textarea v-model="form.buildings.adjuster_notes" class="field-textarea" rows="4"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 8: CONTENTS                       -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 8" class="fields-grid">
          <div class="col-span-2">
            <label class="field-label-standalone">Contents Items</label>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Claimed Amount (£)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in form.contents.items" :key="i">
                    <td class="row-num">{{ i + 1 }}</td>
                    <td><input v-model="row.item" class="table-input"/></td>
                    <td><input v-model="row.description" class="table-input"/></td>
                    <td><input v-model="row.amount" type="number" class="table-input" placeholder="0.00"/></td>
                    <td><button class="btn-remove" @click="form.contents.items.splice(i,1)">✕</button></td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="total-label">Total Contents</td>
                    <td class="total-value">£{{ contentsTotal }}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <button class="btn-add-row" @click="form.contents.items.push({item:'',description:'',amount:''})">
                + Add Item
              </button>
            </div>
          </div>

          <div class="field-group col-span-2">
            <label>Proof of Ownership Available / Viewed</label>
            <div class="radio-row">
              <label class="radio-label"><input type="radio" v-model="form.contents.proof_of_ownership" value="yes"/> Yes — Viewed</label>
              <label class="radio-label"><input type="radio" v-model="form.contents.proof_of_ownership" value="no"/> No</label>
            </div>
          </div>
          <div class="field-group col-span-2">
            <label>Specialist Reports / Instructions Required (Who is appointing?)</label>
            <textarea v-model="form.contents.specialist_reports" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes (Policy limits / Excess / Supplier Instructions / Salvage)</label>
            <textarea v-model="form.contents.adjuster_notes" class="field-textarea" rows="4"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 9: ALTERNATIVE ACCOMMODATION      -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 9" class="fields-grid">
          <div class="field-group col-span-2">
            <label>Is the Property Uninhabitable? (What facilities are impaired)</label>
            <div class="radio-row">
              <label class="radio-label"><input type="radio" v-model="form.accommodation.uninhabitable" value="yes"/> Yes</label>
              <label class="radio-label"><input type="radio" v-model="form.accommodation.uninhabitable" value="no"/> No</label>
            </div>
            <textarea v-if="form.accommodation.uninhabitable === 'yes'" v-model="form.accommodation.uninhabitable_details" class="field-textarea mt-2" rows="2" placeholder="What facilities are impaired…"/>
          </div>
          <div class="field-group col-span-2">
            <label>Who Lives at the Risk Address (Adults / Minors / Pets)</label>
            <input v-model="form.accommodation.who_lives_there" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>What Alternatives Have Been Discussed (Disturbance allowance / AirBnB / Supplier)</label>
            <textarea v-model="form.accommodation.alternatives_discussed" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group">
            <label>Anticipated Disruption Period</label>
            <input v-model="form.accommodation.disruption_period" class="field-input" placeholder="e.g. 6–8 weeks"/>
          </div>
          <div class="field-group col-span-2">
            <label>Cessation of Rent Clause within Tenancy Agreement</label>
            <input v-model="form.accommodation.cessation_of_rent" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Further Actions Required</label>
            <textarea v-model="form.accommodation.further_actions" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes</label>
            <textarea v-model="form.accommodation.adjuster_notes" class="field-textarea" rows="4"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 10: SUM INSURED                   -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 10" class="fields-grid">
          <div class="divider col-span-2"><span>Buildings Sum Insured</span></div>

          <div class="field-group">
            <label>Buildings Sum Insured (£)</label>
            <input v-model="form.sum_insured.buildings_sum" type="number" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Sketch Plan / Measurements</label>
            <textarea v-model="form.sum_insured.sketch_plan" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group">
            <label>Buildings VAR (£)</label>
            <input v-model="form.sum_insured.buildings_var" type="number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Additional Features VAR / Peripherals (£)</label>
            <input v-model="form.sum_insured.additional_var" type="number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Total VAR (£)</label>
            <input :value="buildingsTotalVar" class="field-input field-computed" readonly/>
          </div>
          <div class="field-group">
            <label>Adequacy of Sum Insured (%)</label>
            <input v-model="form.sum_insured.buildings_adequacy" type="number" class="field-input" placeholder="e.g. 95"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes (Buildings)</label>
            <textarea v-model="form.sum_insured.buildings_notes" class="field-textarea" rows="3"/>
          </div>

          <div class="divider col-span-2"><span>Contents Sum Insured</span></div>

          <div class="field-group">
            <label>Current Sum Insured (£)</label>
            <input v-model="form.sum_insured.contents_sum" type="number" class="field-input"/>
          </div>

          <div class="col-span-2">
            <label class="field-label-standalone">Room by Room Breakdown</label>
            <div class="room-grid">
              <template v-for="room in roomList" :key="room.key">
                <label class="room-label">{{ room.label }}</label>
                <input v-model="form.sum_insured.room_breakdown[room.key]" class="field-input room-input" placeholder="£"/>
              </template>
            </div>
          </div>

          <div class="field-group">
            <label>Basis of Valuation</label>
            <select v-model="form.sum_insured.basis_of_valuation" class="field-select">
              <option value="">Select…</option>
              <option>Reinstatement — Including claim value</option>
              <option>Reinstatement — Excluding claim value</option>
              <option>Indemnity — Including claim value</option>
              <option>Indemnity — Excluding claim value</option>
            </select>
          </div>
          <div class="field-group">
            <label>Adequacy of Sum Insured (%)</label>
            <input v-model="form.sum_insured.contents_adequacy" type="number" class="field-input"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes (Contents)</label>
            <textarea v-model="form.sum_insured.contents_notes" class="field-textarea" rows="3"/>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- SECTION 11: RECOVERY & INVESTIGATION      -->
        <!-- ══════════════════════════════════════════ -->
        <div v-if="currentSection === 11" class="fields-grid">
          <div class="divider col-span-2"><span>Recovery</span></div>

          <div class="field-group col-span-2">
            <label>Responsible Party (Name / Contacts etc.)</label>
            <textarea v-model="form.recovery.responsible_party" class="field-textarea" rows="2"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes (Third Party Insurers / Right of Recovery)</label>
            <textarea v-model="form.recovery.adjuster_notes" class="field-textarea" rows="3"/>
          </div>

          <div class="divider col-span-2"><span>Investigation Indicators</span></div>

          <div class="col-span-2">
            <div class="indicators-grid">
              <div
                v-for="ind in investigationIndicators"
                :key="ind.key"
                class="indicator-item"
                :class="{ flagged: form.recovery.indicators[ind.key] }"
                @click="form.recovery.indicators[ind.key] = !form.recovery.indicators[ind.key]"
              >
                <div class="indicator-check">
                  <svg v-if="form.recovery.indicators[ind.key]" width="12" height="12" viewBox="0 0 12 12">
                    <polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                  </svg>
                </div>
                {{ ind.label }}
              </div>
            </div>
          </div>

          <div class="field-group col-span-2">
            <label>Other Adjuster Concerns &amp; Actions Required</label>
            <textarea v-model="form.recovery.other_concerns" class="field-textarea" rows="3"/>
          </div>

          <div class="divider col-span-2"><span>End of Site Visit Summary</span></div>

          <div class="field-group col-span-2">
            <label>Claim Status</label>
            <select v-model="form.recovery.claim_status" class="field-select">
              <option value="">Select…</option>
              <option>Open — Ongoing investigation</option>
              <option>Open — Awaiting information</option>
              <option>Open — Quantum to be agreed</option>
              <option>Recommended — Settlement</option>
              <option>Recommended — Repudiation</option>
              <option>Closed</option>
            </select>
          </div>
          <div class="field-group col-span-2">
            <label>Enquiries Required (Next actions / Responsible parties)</label>
            <textarea v-model="form.recovery.enquiries_required" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Summary of Claim Position</label>
            <textarea v-model="form.recovery.claim_summary" class="field-textarea" rows="4"/>
          </div>

          <div class="divider col-span-2"><span>Reserve Split</span></div>

          <div class="field-group">
            <label>Buildings (£)</label>
            <input v-model="form.recovery.reserve.buildings" type="number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Trade Contents (£)</label>
            <input v-model="form.recovery.reserve.trade_contents" type="number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Stock (£)</label>
            <input v-model="form.recovery.reserve.stock" type="number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Machinery &amp; Plant (£)</label>
            <input v-model="form.recovery.reserve.machinery" type="number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>BI (£)</label>
            <input v-model="form.recovery.reserve.bi" type="number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Other (£)</label>
            <input v-model="form.recovery.reserve.other" type="number" class="field-input"/>
          </div>
          <div class="field-group">
            <label>Total (excl. fee) (£)</label>
            <input :value="reserveTotal" class="field-input field-computed" readonly/>
          </div>

          <div class="divider col-span-2"><span>Action Plan</span></div>

          <div class="field-group col-span-2">
            <label>Issues to Resolve</label>
            <textarea v-model="form.recovery.action_plan.issues" class="field-textarea" rows="3" placeholder="If no issues, state so"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Actions Required (with timeframes)</label>
            <textarea v-model="form.recovery.action_plan.adjuster_actions" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Policyholder Actions Required (with agreed timeframes)</label>
            <textarea v-model="form.recovery.action_plan.policyholder_actions" class="field-textarea" rows="3"/>
          </div>
          <div class="field-group col-span-2">
            <label>Adjuster Notes</label>
            <textarea v-model="form.recovery.action_plan.adjuster_notes" class="field-textarea" rows="4"/>
          </div>
        </div>

        <!-- BOTTOM NAV -->
        <div class="section-bottom-nav">
          <button class="btn-prev" :disabled="currentSection === 0" @click="currentSection--">← Previous</button>
          <button v-if="currentSection < sections.length - 1" class="btn-next" @click="currentSection++">Next Section →</button>
          <button v-else class="btn-submit-final" @click="submitInspection" :disabled="isSubmitting">
            {{ isSubmitting ? 'Submitting…' : '✓ Submit Inspection Report' }}
          </button>
        </div>

      </div>
    </main>

    <!-- TOAST -->
    <transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import flatpickr from "flatpickr"
import { english } from "flatpickr/dist/l10n/default.js"
import "flatpickr/dist/flatpickr.css"

const currentSection = ref(0)
const isSubmitting = ref(false)
const claims = ref([])
const selectedClaimId = ref('')

const toast = ref({ show: false, message: '', type: 'success' })

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3500)
}

const sections = [
  { label: 'Claim & Basic Info' },
  { label: 'Site Visit Info' },
  { label: 'The Insured' },
  { label: 'The Premises' },
  { label: 'Protections' },
  { label: 'Discovery & Perils' },
  { label: 'Theft / Malicious Damage' },
  { label: 'Buildings (FNQ)' },
  { label: 'Contents' },
  { label: 'Alternative Accommodation' },
  { label: 'Sum Insured' },
  { label: 'Recovery & End of Visit' },
]

const form = ref({
  header: {
    file_number: '', date: '', date_of_incident: '', claimant_name: '',
    claimant_phone: '', claimant_email: '', insurer_name: '', insurer_other: '',
    type_of_case: '', policy_number: '', claim_number: '', other_rep: '',
    other_rep_email: '', other_rep_phone: '', type_of_loss: '',
    details_of_loss: '', inspection_date: '', other_info: ''
  },
  site: {
    incident_ref: '', field_adjuster: '', internal_adjuster: '',
    visit_date: '', visit_time: '', persons_present: '',
    contact_numbers: '', email: '', gdpr_obtained: '', gdpr_reason: '',
    adjuster_notes: ''
  },
  insured: {
    policyholder_name_dob: '', occupation: '', address: '',
    period_of_residence: '', previous_addresses: '', period_on_cover: '',
    previous_insurers: '', previous_claims: ['', '', ''],
    convictions: '', other_occupiers: '', adjuster_notes: ''
  },
  premises: {
    property_type: '', storeys: '', bedrooms: '', roof: '',
    basement_attic: '', date_of_construction: '', listing_status: '',
    maintenance_standard: '', ownership_status: ''
  },
  protections: {
    front_door: { lock_make: '', lock_type: '' },
    rear_door: { lock_make: '', lock_type: '' },
    side_door: { lock_make: '', lock_type: '' },
    french_door: { lock_make: '', lock_type: '' },
    patio_conservatory: { lock_make: '', lock_type: '' },
    windows: { front: '', front_locks: '', side: '', side_locks: '', rear: '', rear_locks: '' },
    alarm_details: '', recommendations: '', risk_issues: '',
    warranties_complied: '', warranties_notes: '', adjuster_notes: ''
  },
  discovery: {
    discovered_datetime: '', discovered_by: '', last_occupied: '',
    operating_peril: '', circumstances: '', causation_issues: '',
    evidence: '', adjuster_notes: ''
  },
  theft: {
    occupants_prior: '', last_to_leave: '', fully_secured: '',
    method_of_entry: '', method_of_exit: '', force_evidence: '',
    crn: '', police_station: '', police_report_required: '', adjuster_notes: ''
  },
  buildings: {
    damaged_areas: [{ area: '', length: '', width: '', height: '' }],
    room_damage: [{ room: '', damage: '' }],
    damage_consistent: '', betterment: '', maintenance: '',
    actions_quantum: '', adjuster_notes: ''
  },
  contents: {
    items: [{ item: '', description: '', amount: '' }],
    proof_of_ownership: '', specialist_reports: '', adjuster_notes: ''
  },
  accommodation: {
    uninhabitable: '', uninhabitable_details: '', who_lives_there: '',
    alternatives_discussed: '', disruption_period: '',
    cessation_of_rent: '', further_actions: '', adjuster_notes: ''
  },
  sum_insured: {
    buildings_sum: '', buildings_var: '', additional_var: '', buildings_adequacy: '',
    buildings_notes: '', sketch_plan: '', contents_sum: '',
    room_breakdown: {
      lounge: '', dining_room: '', kitchen: '', bedroom_1: '', bedroom_2: '',
      bedroom_3: '', bedroom_4: '', study: '', garage: '', technology: '',
      valuables: '', exceptional_items: '', others: ''
    },
    basis_of_valuation: '', contents_adequacy: '', contents_notes: ''
  },
  recovery: {
    responsible_party: '', adjuster_notes: '',
    indicators: {
      recent_inception: false, adverse_loss_history: false, unavailable_interview: false,
      identity_in_doubt: false, method_not_supportable: false, dilapidated: false,
      inadequate_documentation: false, detailed_claims_knowledge: false,
      claim_withdrawn: false, inadequate_cooperation: false, pressure_cash_settlement: false,
      criminal_convictions: false, financial_difficulties: false,
      unreasonable_threats: false, first_policy: false, police_report_delayed: false,
      reluctance_to_repair: false
    },
    other_concerns: '', claim_status: '', enquiries_required: '',
    claim_summary: '',
    reserve: { buildings: '', trade_contents: '', stock: '', machinery: '', bi: '', other: '' },
    action_plan: { issues: '', adjuster_actions: '', policyholder_actions: '', adjuster_notes: '' }
  }
})

const investigationIndicators = [
  { key: 'recent_inception', label: 'Recent Inception / Cover Change' },
  { key: 'adverse_loss_history', label: 'Adverse Loss / Insurance History' },
  { key: 'unavailable_interview', label: 'Unavailable / Resisting Interview' },
  { key: 'identity_in_doubt', label: 'Identity of Insured in Doubt' },
  { key: 'method_not_supportable', label: 'Method of Loss Not Supportable' },
  { key: 'dilapidated', label: 'Dilapidated Property' },
  { key: 'inadequate_documentation', label: 'Adequacy of Documentation' },
  { key: 'detailed_claims_knowledge', label: 'Detailed Knowledge of Claims Process' },
  { key: 'claim_withdrawn', label: 'Claim Unexpectedly Withdrawn' },
  { key: 'inadequate_cooperation', label: 'Inadequate Co-operation' },
  { key: 'pressure_cash_settlement', label: 'Unreasonable Pressure for Cash Settlement' },
  { key: 'criminal_convictions', label: 'Criminal Convictions' },
  { key: 'financial_difficulties', label: 'Financial Difficulties' },
  { key: 'unreasonable_threats', label: 'Unreasonable Threats / Complaints' },
  { key: 'first_policy', label: 'First Policy' },
  { key: 'police_report_delayed', label: 'Police Report Delayed / Not Made' },
  { key: 'reluctance_to_repair', label: 'Unreasonable Reluctance to Repair/Replace' },
]

const roomList = [
  { key: 'lounge', label: 'Lounge' },
  { key: 'dining_room', label: 'Dining Room' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'bedroom_1', label: 'Bedroom 1' },
  { key: 'bedroom_2', label: 'Bedroom 2' },
  { key: 'bedroom_3', label: 'Bedroom 3' },
  { key: 'bedroom_4', label: 'Bedroom 4' },
  { key: 'study', label: 'Study' },
  { key: 'garage', label: 'Garage' },
  { key: 'technology', label: 'Technology' },
  { key: 'valuables', label: 'Valuables' },
  { key: 'exceptional_items', label: 'Exceptional Items' },
  { key: 'others', label: 'Others' },
]

const doorLabel = (key) => ({
  front_door: 'Front Door',
  rear_door: 'Rear Door',
  side_door: 'Side Door',
  french_door: 'French Door',
  patio_conservatory: 'Patio / Conservatory',
}[key] || key)

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

const contentsTotal = computed(() => {
  return form.value.contents.items
    .reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0)
    .toFixed(2)
})

const buildingsTotalVar = computed(() => {
  const a = parseFloat(form.value.sum_insured.buildings_var) || 0
  const b = parseFloat(form.value.sum_insured.additional_var) || 0
  return (a + b).toFixed(2)
})

const reserveTotal = computed(() => {
  const r = form.value.recovery.reserve
  return Object.values(r).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(2)
})

const sectionDone = (i) => {
  if (i === 0) return !!selectedClaimId.value && !!form.value.header.file_number
  if (i === 1) return !!form.value.site.visit_date && !!form.value.site.field_adjuster
  if (i === 2) return !!form.value.insured.policyholder_name_dob
  if (i === 3) return !!form.value.premises.property_type
  if (i === 4) return !!form.value.protections.front_door.lock_make
  if (i === 5) return !!form.value.discovery.operating_peril
  if (i === 6) return !!form.value.theft.method_of_entry
  if (i === 7) return form.value.buildings.damaged_areas.length > 0 && !!form.value.buildings.damaged_areas[0].area
  if (i === 8) return form.value.contents.items.length > 0 && !!form.value.contents.items[0].item
  if (i === 9) return !!form.value.accommodation.uninhabitable
  if (i === 10) return !!form.value.sum_insured.buildings_sum
  if (i === 11) return !!form.value.recovery.claim_status
  return false
}

const completedCount = computed(() => sections.filter((_, i) => sectionDone(i)).length)
const progressPct = computed(() => Math.round((completedCount.value / sections.length) * 100))

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/claims')
    claims.value = await res.json()
  } catch (err) {
    console.error('Failed to load claims:', err)
  }
})

const saveDraft = () => {
  const data = { ...form.value, claim_id: selectedClaimId.value, status: 'draft' }
  localStorage.setItem('inspection_draft', JSON.stringify(data))
  showToast('Draft saved locally', 'success')
}

const submitInspection = async () => {
  if (!selectedClaimId.value) {
    showToast('Please select a claim first', 'error')
    currentSection.value = 0
    return
  }
  isSubmitting.value = true
  try {
    const res = await fetch('http://localhost:5000/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form.value, claim_id: selectedClaimId.value, status: 'submitted' })
    })
    if (!res.ok) throw new Error('Server error')
    showToast('Inspection submitted successfully!', 'success')
  } catch (err) {
    console.error(err)
    showToast('Submission failed. Please try again.', 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.inspection-shell {
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
  font-family: Arial, sans-serif;
  color: #0f172a;
}

/* ── SIDEBAR ── */
.sidebar {
  width: 210px;
  min-width: 210px;
  background: #0f172a;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px 16px 14px;
  border-bottom: 1px solid #1e293b;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}

.claim-badge {
  display: inline-block;
  font-size: 11px;
  background: #1e3a5f;
  color: #93c5fd;
  padding: 2px 8px;
  border-radius: 20px;
}

.sidebar-nav {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 16px;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  color: #64748b;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  font-family: Arial, sans-serif;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  background: #1e293b;
  color: #e2e8f0;
}

.nav-item.active {
  background: #1e293b;
  color: #fff;
  border-left-color: #2563eb;
}

.nav-item.done {
  color: #22c55e;
}

.nav-num {
  font-size: 10px;
  font-family: monospace;
  opacity: 0.5;
  min-width: 18px;
}

.nav-label {
  flex: 1;
  line-height: 1.3;
}

.nav-check {
  color: #22c55e;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 14px 16px;
  border-top: 1px solid #1e293b;
}

.progress-label {
  font-size: 11px;
  color: #475569;
  margin-bottom: 6px;
}

.progress-bar {
  height: 3px;
  background: #1e293b;
  border-radius: 99px;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: #2563eb;
  border-radius: 99px;
  transition: width 0.4s ease;
}

.btn-draft {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #1e293b;
  background: #1e293b;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  font-family: Arial, sans-serif;
  margin-bottom: 8px;
}

.btn-draft:hover { background: #273549; color: #94a3b8; }

.btn-submit {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: none;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  font-family: Arial, sans-serif;
  cursor: pointer;
}

.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-submit:not(:disabled):hover { background: #1d4ed8; }

/* ── MAIN CONTENT ── */
.main-content {
  flex: 1;
  padding: 28px 32px;
}

.section-wrapper {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.section-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.section-meta {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.section-num {
  font-size: 12px;
  font-family: monospace;
  color: #2563eb;
  font-weight: 700;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.section-nav-btns {
  display: flex;
  gap: 8px;
}

/* ── FIELDS ── */
.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 24px;
  column-gap: 20px;
}

.col-span-2 { grid-column: span 2; }

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-group label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-label-standalone {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.field-input,
.field-select,
.field-textarea {
  padding: 9px 12px;
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
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.field-computed {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
}

.field-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.field-hint {
  font-size: 11px;
  color: #94a3b8;
  margin: 2px 0 0;
}

.mt-2 { margin-top: 8px; }

.divider {
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.divider span {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  white-space: nowrap;
}

/* ── RADIO ── */
.radio-row {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: normal !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  color: #0f172a !important;
  cursor: pointer;
}

/* ── TABLES ── */
.table-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  background: #f8fafc;
  padding: 8px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #f1f5f9;
}

.data-table tfoot td {
  background: #f8fafc;
  font-weight: 700;
  border-top: 2px solid #e2e8f0;
}

.total-label { color: #64748b; font-size: 12px; text-align: right; }
.total-value { color: #0f172a; font-size: 14px; }
.row-num { color: #94a3b8; font-size: 12px; text-align: center; }

.table-input {
  width: 100%;
  border: none;
  padding: 4px 6px;
  font-size: 13px;
  font-family: Arial, sans-serif;
  background: transparent;
  outline: none;
  color: #0f172a;
}

.table-input:focus {
  background: #eff6ff;
  border-radius: 4px;
}

.btn-remove {
  background: none;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  font-size: 13px;
  padding: 3px 6px;
  border-radius: 4px;
}

.btn-remove:hover { color: #ef4444; background: #fef2f2; }

.btn-add-row {
  display: block;
  width: 100%;
  padding: 8px;
  background: #f8fafc;
  border: none;
  border-top: 1px solid #e2e8f0;
  font-size: 13px;
  color: #2563eb;
  cursor: pointer;
  font-family: Arial, sans-serif;
  font-weight: 600;
}

.btn-add-row:hover { background: #eff6ff; }

/* ── INVESTIGATION INDICATORS ── */
.indicators-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.indicator-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  background: #fff;
  user-select: none;
  transition: all 0.15s;
}

.indicator-item:hover { border-color: #2563eb; background: #eff6ff; }

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

/* ── ROOM GRID ── */
.room-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  align-items: center;
}

.room-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

/* ── BOTTOM NAV ── */
.section-bottom-nav {
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.btn-prev,
.btn-next {
  padding: 8px 18px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  font-family: Arial, sans-serif;
  color: #0f172a;
  transition: all 0.15s;
}

.btn-prev:hover:not(:disabled),
.btn-next:hover:not(:disabled) {
  border-color: #2563eb;
  color: #2563eb;
}

.btn-prev:disabled { opacity: 0.35; cursor: not-allowed; }

.btn-next {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
  font-weight: 600;
}

.btn-next:hover:not(:disabled) { background: #1d4ed8; }

.btn-submit-final {
  padding: 9px 22px;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  font-family: Arial, sans-serif;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-submit-final:hover:not(:disabled) { background: #15803d; }
.btn-submit-final:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── TOAST ── */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 11px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  font-family: Arial, sans-serif;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.toast.success { background: #16a34a; color: #fff; }
.toast.error   { background: #ef4444; color: #fff; }

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px); }
</style>