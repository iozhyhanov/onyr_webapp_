import "dotenv/config"
import express from "express"
import mysql from "mysql2/promise"
import cors from "cors"
import fs from "fs"
import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import path from "path"
import { fileURLToPath } from "url"
import { Document, Packer, Paragraph, TextRun } from "docx"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET

// ── VALIDATION ───────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/

function validate(rules) {
  return (req, res, next) => {
    const errors = []
    for (const [field, checks] of Object.entries(rules)) {
      const val = req.body[field]
      if (checks.required && (val === undefined || val === null || val === "")) {
        errors.push(`${field} is required`)
        continue
      }
      if (val === undefined || val === null || val === "") continue
      if (checks.type === "string" && typeof val !== "string") {
        errors.push(`${field} must be a string`)
      }
      if (checks.type === "number" && isNaN(Number(val))) {
        errors.push(`${field} must be a number`)
      }
      if (checks.min && typeof val === "string" && val.trim().length < checks.min) {
        errors.push(`${field} must be at least ${checks.min} characters`)
      }
      if (checks.email && !EMAIL_RE.test(val)) {
        errors.push(`${field} must be a valid email`)
      }
      if (checks.date && !DATE_RE.test(val)) {
        errors.push(`${field} must be a valid date (YYYY-MM-DD)`)
      }
      if (checks.enum && !checks.enum.includes(val)) {
        errors.push(`${field} must be one of: ${checks.enum.join(", ")}`)
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors })
    }
    next()
  }
}

// ── Auth middleware ──────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]
  if (!token) return res.status(401).json({ error: "Not authenticated" })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: "Invalid token" })
  }
}

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" })
  next()
}

const app = express()

// middleware
app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  console.log("->", req.method, req.url)
  next()
})

// DB pool
const db = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     Number(process.env.DB_PORT) || 3306
})

// ── HELPERS ──────────────────────────────────────────────

const formatDate = (date) => {
  if (!date) return null
  return new Date(date).toISOString().split("T")[0]
}

async function createCustomer(connection, data) {
  const sql = `
    INSERT INTO customers
    (first_name, last_name, date_of_birth, phone, email, address_line, city, postcode, country)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  const values = [
    data.first_name, data.last_name, formatDate(data.date_of_birth),
    data.phone, data.email, data.address_line, data.city, data.postcode, data.country
  ]
  const [result] = await connection.execute(sql, values)
  return result.insertId
}

async function createClaim(connection, customerId, data) {
  const sql = `
    INSERT INTO claims
    (customer_id, insurer_name, policy_number, policy_type, date_of_loss)
    VALUES (?, ?, ?, ?, ?)
  `
  const values = [
    customerId, data.insurer_name, data.policy_number,
    data.policy_type, formatDate(data.date_of_loss)
  ]
  const [result] = await connection.execute(sql, values)
  return result.insertId
}

// ── TEST ──────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.send("Backend works")
})

// ── AUTH ─────────────────────────────────────────────────

app.post("/api/auth/login", validate({
  username: { required: true, type: "string" },
  password: { required: true, type: "string" }
}), async (req, res) => {
  const { username, password } = req.body
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username])
    const user = rows[0]
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid username or password" })
    }
    const payload = {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role
    }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" })
    res.json({ token, user: payload })
  } catch (err) {
    console.error("LOGIN ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json(req.user)
})

// ── USER MANAGEMENT (admin only) ─────────────────────────

app.get("/api/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT user_id, username, full_name, role, created_at FROM users ORDER BY created_at DESC"
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/users", authMiddleware, adminOnly, validate({
  username: { required: true, type: "string", min: 3 },
  password: { required: true, type: "string", min: 6 },
  role:     { enum: ["admin", "worker"] }
}), async (req, res) => {
  const { username, password, full_name, role = "worker" } = req.body
  try {
    const hash = await bcrypt.hash(password, 10)
    const [result] = await db.execute(
      "INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
      [username, hash, full_name || null, role]
    )
    res.json({ user_id: result.insertId, username, full_name, role })
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Username already exists" })
    res.status(500).json({ error: err.message })
  }
})

app.delete("/api/users/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.execute("DELETE FROM users WHERE user_id = ?", [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── CLAIMS ───────────────────────────────────────────────

app.post("/api/claims", authMiddleware, validate({
  first_name:    { required: true, type: "string" },
  last_name:     { required: true, type: "string" },
  insurer_name:  { required: true, type: "string" },
  policy_number: { required: true, type: "string" },
  email:         { email: true },
  date_of_birth: { date: true },
  date_of_loss:  { date: true }
}), async (req, res) => {
  const data = req.body
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const customerId = await createCustomer(connection, data)
    const claimId = await createClaim(connection, customerId, data)
    await connection.commit()
    res.json({ message: "Claim + Customer created", claim_id: claimId, customer_id: customerId })
  } catch (err) {
    await connection.rollback()
    console.error("ERROR:", err)
    res.status(500).json({ error: err.message })
  } finally {
    connection.release()
  }
})

app.get("/api/claims", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        claims.claim_id, claims.insurer_name, claims.policy_number,
        claims.policy_type, claims.date_of_loss, claims.claim_status,
        customers.first_name, customers.last_name, customers.email,
        customers.phone, customers.date_of_birth, customers.address_line,
        customers.city, customers.postcode, customers.country,
        fnol.fnol_id
      FROM claims
      JOIN customers ON claims.customer_id = customers.customer_id
      LEFT JOIN fnol ON fnol.claim_id = claims.claim_id
      ORDER BY claims.created_at DESC
    `)
    res.json(rows)
  } catch (err) {
    console.error("DB ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

app.put("/api/claims/:id", authMiddleware, async (req, res) => {
  const claimId = req.params.id
  const data = { ...req.body }

  // Workers cannot change claim_status — admin only
  if (req.user.role !== "admin") {
    delete data.claim_status
  }

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const [rows] = await connection.execute(
      "SELECT customer_id FROM claims WHERE claim_id = ?", [claimId]
    )
    if (rows.length === 0) return res.status(404).json({ error: "Claim not found" })

    const customerId = rows[0].customer_id

    await connection.execute(`
      UPDATE customers SET
        first_name = ?, last_name = ?, date_of_birth = ?, phone = ?,
        email = ?, address_line = ?, city = ?, postcode = ?, country = ?
      WHERE customer_id = ?
    `, [
      data.first_name, data.last_name, formatDate(data.date_of_birth),
      data.phone, data.email, data.address_line, data.city, data.postcode,
      data.country, customerId
    ])

    if (req.user.role === "admin") {
      await connection.execute(`
        UPDATE claims SET
          insurer_name = ?, policy_number = ?, policy_type = ?,
          date_of_loss = ?, claim_status = ?
        WHERE claim_id = ?
      `, [
        data.insurer_name, data.policy_number, data.policy_type,
        formatDate(data.date_of_loss), data.claim_status, claimId
      ])
    } else {
      await connection.execute(`
        UPDATE claims SET
          insurer_name = ?, policy_number = ?, policy_type = ?, date_of_loss = ?
        WHERE claim_id = ?
      `, [
        data.insurer_name, data.policy_number, data.policy_type,
        formatDate(data.date_of_loss), claimId
      ])
    }

    await connection.commit()
    res.json({ message: "Updated successfully" })
  } catch (err) {
    await connection.rollback()
    console.error("UPDATE ERROR:", err)
    res.status(500).json({ error: err.message })
  } finally {
    connection.release()
  }
})

app.get("/api/claims/:id/doc", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id
    const safe = (v) => v || ""
    const [rows] = await db.query(`
      SELECT
        claims.claim_id, claims.insurer_name, claims.policy_number,
        claims.policy_type, claims.date_of_loss,
        customers.first_name, customers.last_name, customers.phone,
        customers.email, customers.address_line, customers.city,
        customers.postcode, customers.country,
        fnol.loss_time, fnol.loss_location, fnol.loss_type,
        fnol.short_description, fnol.detailed_description,
        fnol.third_party_involved, fnol.police_report_number
      FROM claims
      JOIN customers ON claims.customer_id = customers.customer_id
      LEFT JOIN fnol ON fnol.claim_id = claims.claim_id
      WHERE claims.claim_id = ?
    `, [id])

    const data = rows[0]
    if (!data) return res.status(404).send("Claim not found")

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ alignment: "center", children: [new TextRun({ text: "FIRST NOTICE OF LOSS", bold: true, size: 32 })] }),
          new Paragraph(""),
          new Paragraph({ children: [new TextRun({ text: "File Number: ", bold: true }), new TextRun(String(data.claim_id))] }),
          new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun({ text: new Date().toLocaleDateString("en-GB"), underline: {} })] }),
          new Paragraph({ children: [new TextRun({ text: "Date of Incident: ", bold: true }), new TextRun(formatDate(data.date_of_loss) || "")] }),
          new Paragraph(""),
          new Paragraph({ children: [new TextRun({ text: "CLAIMANT DETAILS", bold: true, size: 26 })] }),
          new Paragraph({ children: [new TextRun({ text: "Name of Claimant: ", bold: true }), new TextRun(`${data.first_name} ${data.last_name}`)] }),
          new Paragraph({ children: [new TextRun({ text: "Contact number: ", bold: true }), new TextRun(safe(data.phone))] }),
          new Paragraph({ children: [new TextRun({ text: "Email: ", bold: true }), new TextRun(safe(data.email))] }),
          new Paragraph(""),
          new Paragraph({ children: [new TextRun({ text: "INSURER DETAILS", bold: true, size: 26 })] }),
          new Paragraph({ children: [new TextRun({ text: "Name of Insurer: ", bold: true }), new TextRun(safe(data.insurer_name))] }),
          new Paragraph(""),
          new Paragraph({ children: [new TextRun({ text: "POLICY DETAILS", bold: true, size: 26 })] }),
          new Paragraph({ children: [new TextRun({ text: "Type of case: ", bold: true }), new TextRun(safe(data.policy_type))] }),
          new Paragraph({ children: [new TextRun({ text: "Policy Number: ", bold: true }), new TextRun(safe(data.policy_number))] }),
          new Paragraph({ children: [new TextRun({ text: "Claim number: ", bold: true }), new TextRun(String(data.claim_id))] }),
          new Paragraph(""),
          new Paragraph({ children: [new TextRun({ text: "LOSS DETAILS", bold: true, size: 26 })] }),
          new Paragraph({ children: [new TextRun({ text: "Type of loss: ", bold: true }), new TextRun(safe(data.loss_type))] }),
          new Paragraph({ children: [new TextRun({ text: "Details of loss: ", bold: true }), new TextRun(safe(data.detailed_description))] }),
          new Paragraph({ children: [new TextRun({ text: "Other information: ", bold: true }), new TextRun(safe(data.short_description))] }),
        ]
      }]
    })

    const buffer = await Packer.toBuffer(doc)
    res.setHeader("Content-Disposition", `attachment; filename=claim_${id}.docx`)
    res.send(buffer)
  } catch (err) {
    console.error(err)
    res.status(500).send(err.message)
  }
})

// ── FNOL ─────────────────────────────────────────────────

app.post("/api/fnol", authMiddleware, validate({
  claim_id:  { required: true, type: "number" },
  loss_type: { required: true, type: "string" }
}), async (req, res) => {
  const data = req.body
  const safe = (v) => v === undefined ? null : v
  try {
    const [result] = await db.execute(`
      INSERT INTO fnol (
        claim_id, loss_time, loss_location, loss_type,
        short_description, detailed_description,
        third_party_involved, police_report_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      safe(data.claim_id), safe(data.loss_time), safe(data.loss_location),
      safe(data.loss_type), safe(data.short_description), safe(data.detailed_description),
      safe(data.third_party_involved), safe(data.police_report_number)
    ])
    res.json({ message: "FNOL created", id: result.insertId })
  } catch (err) {
    console.error("FNOL ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

// ── INSPECTIONS ───────────────────────────────────────────

app.post("/api/inspections", authMiddleware, validate({
  claim_id: { required: true, type: "number" }
}), async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const b = req.body
    const s = (v) => (v === undefined || v === "") ? null : v

    const [main] = await conn.execute(`
      INSERT INTO inspections (
        claim_id, status,
        file_number, date, date_of_incident, policy_number, claim_number, type_of_case,
        claimant_name, claimant_phone, claimant_email,
        insurer_name, insurer_other,
        other_rep, other_rep_email, other_rep_phone,
        type_of_loss, details_of_loss, inspection_date, other_info
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      s(b.claim_id), s(b.status),
      s(b.header?.file_number), s(b.header?.date), s(b.header?.date_of_incident),
      s(b.header?.policy_number), s(b.header?.claim_number), s(b.header?.type_of_case),
      s(b.header?.claimant_name), s(b.header?.claimant_phone), s(b.header?.claimant_email),
      s(b.header?.insurer_name), s(b.header?.insurer_other),
      s(b.header?.other_rep), s(b.header?.other_rep_email), s(b.header?.other_rep_phone),
      s(b.header?.type_of_loss), s(b.header?.details_of_loss),
      s(b.header?.inspection_date), s(b.header?.other_info)
    ])
    const id = main.insertId

    const sv = b.site || {}
    await conn.execute(`
      INSERT INTO inspection_site (
        inspection_id, incident_ref, field_adjuster, internal_adjuster,
        visit_date, visit_time, persons_present, contact_numbers, email,
        gdpr_obtained, gdpr_reason, adjuster_notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      id, s(sv.incident_ref), s(sv.field_adjuster), s(sv.internal_adjuster),
      s(sv.visit_date), s(sv.visit_time), s(sv.persons_present),
      s(sv.contact_numbers), s(sv.email),
      s(sv.gdpr_obtained), s(sv.gdpr_reason), s(sv.adjuster_notes)
    ])

    const ins = b.insured || {}
    await conn.execute(`
      INSERT INTO inspection_insured (
        inspection_id, policyholder_name_dob, occupation, address,
        period_of_residence, previous_addresses, period_on_cover, previous_insurers,
        previous_claim_1, previous_claim_2, previous_claim_3,
        convictions, other_occupiers, adjuster_notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      id, s(ins.policyholder_name_dob), s(ins.occupation), s(ins.address),
      s(ins.period_of_residence), s(ins.previous_addresses), s(ins.period_on_cover),
      s(ins.previous_insurers),
      s(ins.previous_claims?.[0]), s(ins.previous_claims?.[1]), s(ins.previous_claims?.[2]),
      s(ins.convictions), s(ins.other_occupiers), s(ins.adjuster_notes)
    ])

    const pr = b.premises || {}
    await conn.execute(`
      INSERT INTO inspection_premises (
        inspection_id, property_type, storeys, bedrooms, roof,
        basement_attic, date_of_construction, listing_status,
        maintenance_standard, ownership_status
      ) VALUES (?,?,?,?,?,?,?,?,?,?)
    `, [
      id, s(pr.property_type), s(pr.storeys) || null, s(pr.bedrooms) || null,
      s(pr.roof), s(pr.basement_attic), s(pr.date_of_construction),
      s(pr.listing_status), s(pr.maintenance_standard), s(pr.ownership_status)
    ])

    const pt = b.protections || {}
    const w = pt.windows || {}
    await conn.execute(`
      INSERT INTO inspection_protections (
        inspection_id,
        front_door_lock_make, front_door_lock_type,
        rear_door_lock_make,  rear_door_lock_type,
        side_door_lock_make,  side_door_lock_type,
        french_door_lock_make,french_door_lock_type,
        patio_lock_make,      patio_lock_type,
        win_front, win_front_locks, win_side, win_side_locks, win_rear, win_rear_locks,
        alarm_details, recommendations, risk_issues,
        warranties_complied, warranties_notes, adjuster_notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      id,
      s(pt.front_door?.lock_make),       s(pt.front_door?.lock_type),
      s(pt.rear_door?.lock_make),         s(pt.rear_door?.lock_type),
      s(pt.side_door?.lock_make),         s(pt.side_door?.lock_type),
      s(pt.french_door?.lock_make),       s(pt.french_door?.lock_type),
      s(pt.patio_conservatory?.lock_make),s(pt.patio_conservatory?.lock_type),
      s(w.front), s(w.front_locks), s(w.side), s(w.side_locks), s(w.rear), s(w.rear_locks),
      s(pt.alarm_details), s(pt.recommendations), s(pt.risk_issues),
      s(pt.warranties_complied), s(pt.warranties_notes), s(pt.adjuster_notes)
    ])

    const dv = b.discovery || {}
    await conn.execute(`
      INSERT INTO inspection_discovery (
        inspection_id, discovered_datetime, discovered_by, last_occupied,
        operating_peril, circumstances, causation_issues, evidence, adjuster_notes
      ) VALUES (?,?,?,?,?,?,?,?,?)
    `, [
      id, s(dv.discovered_datetime), s(dv.discovered_by), s(dv.last_occupied),
      s(dv.operating_peril), s(dv.circumstances), s(dv.causation_issues),
      s(dv.evidence), s(dv.adjuster_notes)
    ])

    const th = b.theft || {}
    await conn.execute(`
      INSERT INTO inspection_theft (
        inspection_id, occupants_prior, last_to_leave, fully_secured,
        method_of_entry, method_of_exit, force_evidence, crn,
        police_station, police_report_required, adjuster_notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `, [
      id, s(th.occupants_prior), s(th.last_to_leave), s(th.fully_secured),
      s(th.method_of_entry), s(th.method_of_exit), s(th.force_evidence),
      s(th.crn), s(th.police_station), s(th.police_report_required), s(th.adjuster_notes)
    ])

    const bl = b.buildings || {}
    await conn.execute(`
      INSERT INTO inspection_buildings (
        inspection_id, damaged_areas, room_damage, damage_consistent,
        betterment, maintenance, actions_quantum, adjuster_notes
      ) VALUES (?,?,?,?,?,?,?,?)
    `, [
      id,
      JSON.stringify(bl.damaged_areas || []),
      JSON.stringify(bl.room_damage || []),
      s(bl.damage_consistent), s(bl.betterment), s(bl.maintenance),
      s(bl.actions_quantum), s(bl.adjuster_notes)
    ])

    const ct = b.contents || {}
    const totalAmount = (ct.items || []).reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0)
    await conn.execute(`
      INSERT INTO inspection_contents (
        inspection_id, items, total_amount,
        proof_of_ownership, specialist_reports, adjuster_notes
      ) VALUES (?,?,?,?,?,?)
    `, [
      id, JSON.stringify(ct.items || []), totalAmount.toFixed(2),
      s(ct.proof_of_ownership), s(ct.specialist_reports), s(ct.adjuster_notes)
    ])

    const ac = b.accommodation || {}
    await conn.execute(`
      INSERT INTO inspection_accommodation (
        inspection_id, uninhabitable, uninhabitable_details, who_lives_there,
        alternatives_discussed, disruption_period, cessation_of_rent,
        further_actions, adjuster_notes
      ) VALUES (?,?,?,?,?,?,?,?,?)
    `, [
      id, s(ac.uninhabitable), s(ac.uninhabitable_details), s(ac.who_lives_there),
      s(ac.alternatives_discussed), s(ac.disruption_period), s(ac.cessation_of_rent),
      s(ac.further_actions), s(ac.adjuster_notes)
    ])

    const si = b.sum_insured || {}
    await conn.execute(`
      INSERT INTO inspection_sum_insured (
        inspection_id, buildings_sum, sketch_plan, buildings_var, additional_var,
        buildings_adequacy, buildings_notes, contents_sum, room_breakdown,
        basis_of_valuation, contents_adequacy, contents_notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      id,
      s(si.buildings_sum) || null, s(si.sketch_plan),
      s(si.buildings_var) || null, s(si.additional_var) || null,
      s(si.buildings_adequacy) || null, s(si.buildings_notes),
      s(si.contents_sum) || null, JSON.stringify(si.room_breakdown || {}),
      s(si.basis_of_valuation), s(si.contents_adequacy) || null, s(si.contents_notes)
    ])

    const rc = b.recovery || {}
    const ind = rc.indicators || {}
    const rv = rc.reserve || {}
    const ap = rc.action_plan || {}
    await conn.execute(`
      INSERT INTO inspection_recovery (
        inspection_id, responsible_party, adjuster_notes,
        ind_recent_inception, ind_adverse_loss_history, ind_unavailable_interview,
        ind_identity_in_doubt, ind_method_not_supportable, ind_dilapidated,
        ind_inadequate_documentation, ind_detailed_claims_knowledge, ind_claim_withdrawn,
        ind_inadequate_cooperation, ind_pressure_cash_settlement, ind_criminal_convictions,
        ind_financial_difficulties, ind_unreasonable_threats, ind_first_policy,
        ind_police_report_delayed, ind_reluctance_to_repair,
        other_concerns, claim_status, enquiries_required, claim_summary,
        reserve_buildings, reserve_trade_contents, reserve_stock,
        reserve_machinery, reserve_bi, reserve_other,
        action_issues, action_adjuster, action_policyholder, action_notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      id, s(rc.responsible_party), s(rc.adjuster_notes),
      ind.recent_inception ? 1:0,         ind.adverse_loss_history ? 1:0,
      ind.unavailable_interview ? 1:0,    ind.identity_in_doubt ? 1:0,
      ind.method_not_supportable ? 1:0,   ind.dilapidated ? 1:0,
      ind.inadequate_documentation ? 1:0, ind.detailed_claims_knowledge ? 1:0,
      ind.claim_withdrawn ? 1:0,          ind.inadequate_cooperation ? 1:0,
      ind.pressure_cash_settlement ? 1:0, ind.criminal_convictions ? 1:0,
      ind.financial_difficulties ? 1:0,   ind.unreasonable_threats ? 1:0,
      ind.first_policy ? 1:0,             ind.police_report_delayed ? 1:0,
      ind.reluctance_to_repair ? 1:0,
      s(rc.other_concerns), s(rc.claim_status), s(rc.enquiries_required), s(rc.claim_summary),
      s(rv.buildings) || null, s(rv.trade_contents) || null, s(rv.stock) || null,
      s(rv.machinery) || null, s(rv.bi) || null, s(rv.other) || null,
      s(ap.issues), s(ap.adjuster_actions), s(ap.policyholder_actions), s(ap.adjuster_notes)
    ])

    await conn.commit()
    res.json({ ok: true, inspection_id: id })
  } catch (err) {
    await conn.rollback()
    console.error("INSPECTION ERROR:", err)
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

app.get("/api/inspections/by-claim/:claimId", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        ir.ind_recent_inception, ir.ind_adverse_loss_history, ir.ind_unavailable_interview,
        ir.ind_identity_in_doubt, ir.ind_method_not_supportable, ir.ind_dilapidated,
        ir.ind_inadequate_documentation, ir.ind_inadequate_cooperation,
        ir.ind_police_report_delayed, ir.ind_detailed_claims_knowledge,
        ir.ind_claim_withdrawn, ir.ind_criminal_convictions
      FROM inspections i
      LEFT JOIN inspection_recovery ir ON ir.inspection_id = i.inspection_id
      WHERE i.claim_id = ?
      ORDER BY i.created_at DESC
      LIMIT 1
    `, [req.params.claimId])

    if (!rows.length) return res.json({ indicators: {} })
    res.json({ indicators: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── PRELIMINARY REPORTS ───────────────────────────────────

app.post("/api/preliminary-reports", authMiddleware, validate({
  claim_id:      { required: true, type: "number" },
  our_reference: { required: true, type: "string" }
}), async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const b = req.body
    const s = (v) => (v === undefined || v === "") ? null : v

    const [result] = await conn.execute(`
      INSERT INTO preliminary_reports (
        claim_id,
        our_reference, claims_handler, broker,
        situation_of_damage, usage_of_building, trade_occupation,
        vat_status, vat_deducted, public_loss_assessor, registration_no,
        notification_date, first_contact, instruction_date, first_inspection,
        fire_brigade, policy_application, under_insurance, policy_limits,
        recovery, policy_deductible, claim_amount, interim_payment,
        required_from_insurer, documentation, information_points,
        introduction, the_insured, incident_and_damage,
        claim_details, application_of_policy, next_actions,
        buildings_sum_insured, buildings_interim, buildings_previous, buildings_reserve,
        chk_inception_after_incident, chk_delay_notification, chk_insured_unavailable,
        chk_identity_in_doubt, chk_loss_method_not_supported, chk_redundant_dilapidated,
        chk_lack_of_documentation, chk_unoccupancy, chk_no_police_report,
        chk_suspicious_documentation, chk_lack_of_evidence, chk_sanction_verification
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      s(b.claim_id),
      s(b.our_reference), s(b.claims_handler), s(b.broker),
      s(b.situation_of_damage), s(b.usage_of_building), s(b.trade_occupation),
      s(b.vat_status), s(b.vat_deducted), s(b.public_loss_assessor), s(b.registration_no),
      s(b.notification_date) || null, s(b.first_contact),
      s(b.instruction_date) || null, s(b.first_inspection) || null,
      s(b.fire_brigade), s(b.policy_application), s(b.under_insurance), s(b.policy_limits),
      s(b.recovery), s(b.policy_deductible) || null, s(b.claim_amount) || null,
      s(b.interim_payment) || null, s(b.required_from_insurer),
      s(b.documentation), s(b.information_points),
      s(b.introduction), s(b.the_insured), s(b.incident_and_damage),
      s(b.claim_details), s(b.application_of_policy), s(b.next_actions),
      s(b.buildings_sum_insured) || null, s(b.buildings_interim) || null,
      s(b.buildings_previous) || null, s(b.buildings_reserve) || null,
      s(b.chk_inception_after_incident), s(b.chk_delay_notification), s(b.chk_insured_unavailable),
      s(b.chk_identity_in_doubt), s(b.chk_loss_method_not_supported), s(b.chk_redundant_dilapidated),
      s(b.chk_lack_of_documentation), s(b.chk_unoccupancy), s(b.chk_no_police_report),
      s(b.chk_suspicious_documentation), s(b.chk_lack_of_evidence), s(b.chk_sanction_verification)
    ])

    await conn.commit()
    res.json({ ok: true, report_id: result.insertId })
  } catch (err) {
    await conn.rollback()
    console.error("PRELIM ERROR:", err)
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

// ── START SERVER ──────────────────────────────────────────

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
