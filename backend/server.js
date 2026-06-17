import "dotenv/config"
import express from "express"
import mysql from "mysql2/promise"
import cors from "cors"
import fs from "fs"
import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import path from "path"
import { fileURLToPath } from "url"
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType,
  Header, Footer, PageNumber, VerticalAlign
} from "docx"
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
        fnol.fnol_id,
        inspections.inspection_id
      FROM claims
      JOIN customers ON claims.customer_id = customers.customer_id
      LEFT JOIN fnol ON fnol.claim_id = claims.claim_id
      LEFT JOIN inspections ON inspections.claim_id = claims.claim_id
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

    // ── Design constants (same as inspection doc) ────────────
    const W     = 9026
    const COL_L = 2706
    const COL_V = 6320
    const DARK  = "0F172A"
    const BLUE  = "2563EB"
    const LGRAY = "F8FAFC"
    const MGRAY = "E2E8F0"
    const TEXT  = "0F172A"
    const MUTED = "64748B"
    const WHITE = "FFFFFF"
    const s     = (v) => (v == null ? "" : String(v))

    const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: MGRAY }
    const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
    const noneB      = { style: BorderStyle.NONE, size: 0, color: WHITE }
    const noBorders  = { top: noneB, bottom: noneB, left: noneB, right: noneB, insideH: noneB, insideV: noneB }
    const pad        = { top: 100, bottom: 100, left: 160, right: 160 }
    const padSm      = { top: 60,  bottom: 60,  left: 160, right: 160 }

    const sectionHdr = (title) => new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      rows: [new TableRow({ children: [new TableCell({
        borders: noBorders, width: { size: W, type: WidthType.DXA },
        shading: { fill: DARK, type: ShadingType.CLEAR },
        margins: { top: 140, bottom: 140, left: 200, right: 200 },
        children: [new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 22, color: WHITE, font: "Arial" })] })]
      })]})]
    })

    const dataTable = (pairs) => new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [COL_L, COL_V],
      rows: pairs.map(([label, value]) => new TableRow({ children: [
        new TableCell({ borders: allBorders, width: { size: COL_L, type: WidthType.DXA },
          shading: { fill: LGRAY, type: ShadingType.CLEAR }, margins: padSm,
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, font: "Arial", color: MUTED })] })] }),
        new TableCell({ borders: allBorders, width: { size: COL_V, type: WidthType.DXA }, margins: padSm,
          children: [new Paragraph({ children: [new TextRun({ text: s(value), size: 18, font: "Arial", color: TEXT })] })] }),
      ]}))
    })

    const gap = (n = 160) => new Paragraph({ spacing: { before: n, after: 0 }, children: [] })

    // Cover
    const H2 = 2256
    const coverTable = new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [H2, H2],
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: H2, type: WidthType.DXA }, margins: pad,
            children: [new Paragraph({ children: [new TextRun({ text: "Claimant", bold: true, size: 18, font: "Arial", color: MUTED })] })] }),
          new TableCell({ borders: noBorders, width: { size: H2, type: WidthType.DXA }, margins: pad,
            children: [new Paragraph({ children: [new TextRun({ text: "Insurer", bold: true, size: 18, font: "Arial", color: MUTED })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: { bottom: thinBorder, top: noneB, left: noneB, right: noneB }, width: { size: H2, type: WidthType.DXA }, margins: { ...pad, bottom: 160 },
            children: [new Paragraph({ children: [new TextRun({ text: `${s(data.first_name)} ${s(data.last_name)}`, bold: true, size: 24, font: "Arial", color: DARK })] })] }),
          new TableCell({ borders: { bottom: thinBorder, top: noneB, left: noneB, right: noneB }, width: { size: H2, type: WidthType.DXA }, margins: { ...pad, bottom: 160 },
            children: [new Paragraph({ children: [new TextRun({ text: s(data.insurer_name), bold: true, size: 24, font: "Arial", color: DARK })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: H2, type: WidthType.DXA }, margins: { ...pad, top: 160 },
            children: [new Paragraph({ children: [new TextRun({ text: `Policy: ${s(data.policy_number)}`, size: 18, font: "Arial", color: MUTED })] })] }),
          new TableCell({ borders: noBorders, width: { size: H2, type: WidthType.DXA }, margins: { ...pad, top: 160 },
            children: [new Paragraph({ children: [new TextRun({ text: `Type: ${s(data.policy_type)}`, size: 18, font: "Arial", color: MUTED })] })] }),
        ]}),
      ]
    })

    const children = [
      // Title
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 80 },
        children: [new TextRun({ text: "FIRST NOTICE OF LOSS", bold: true, size: 48, font: "Arial", color: DARK })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: `Claim #${id}  |  ${new Date().toLocaleDateString("en-GB")}`, size: 20, font: "Arial", color: MUTED })] }),
      new Paragraph({ spacing: { after: 280 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } }, children: [] }),
      coverTable,
      gap(320),

      // 1. Claimant Details
      sectionHdr("1.  Claimant Details"),
      gap(60),
      dataTable([
        ["Full Name",    `${s(data.first_name)} ${s(data.last_name)}`],
        ["Phone",        data.phone],
        ["Email",        data.email],
        ["Address",      [data.address_line, data.city, data.postcode, data.country].filter(Boolean).join(", ")],
      ]),
      gap(240),

      // 2. Policy Details
      sectionHdr("2.  Policy Details"),
      gap(60),
      dataTable([
        ["Insurer",        data.insurer_name],
        ["Policy Number",  data.policy_number],
        ["Policy Type",    data.policy_type],
        ["Claim Number",   String(data.claim_id)],
        ["Date of Loss",   formatDate(data.date_of_loss)],
      ]),
      gap(240),

      // 3. Loss Details
      sectionHdr("3.  Loss Details"),
      gap(60),
      dataTable([
        ["Type of Loss",        data.loss_type],
        ["Loss Time",           data.loss_time],
        ["Loss Location",       data.loss_location],
        ["Short Description",   data.short_description],
        ["Detailed Description",data.detailed_description],
        ["Third Party Involved",data.third_party_involved],
        ["Police Report No.",   data.police_report_number],
      ]),
      gap(240),
    ]

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 } } },
        headers: {
          default: new Header({ children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: MGRAY, space: 1 } },
            children: [
              new TextRun({ text: "ONYR Insurance", bold: true, size: 18, font: "Arial", color: DARK }),
              new TextRun({ text: `  |  First Notice of Loss  |  Claim #${id}`, size: 18, font: "Arial", color: MUTED }),
            ]
          })] })
        },
        footers: {
          default: new Footer({ children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: MGRAY, space: 1 } },
            children: [
              new TextRun({ text: "Page ", size: 16, font: "Arial", color: MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: MUTED }),
              new TextRun({ text: " of ", size: 16, font: "Arial", color: MUTED }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: "Arial", color: MUTED }),
            ]
          })] })
        },
        children
      }]
    })

    const buffer = await Packer.toBuffer(doc)
    res.setHeader("Content-Disposition", `attachment; filename=fnol_${id}.docx`)
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

app.get("/api/inspections/:id/doc", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id
    const safe = (v) => (v == null || v === undefined ? "" : String(v))

    // ── Design constants ──────────────────────────────────────
    const W     = 9026   // A4 content width (11906 - 2x1440 margins) in DXA
    const COL_L = 2706   // Label column (~30%)
    const COL_V = 6320   // Value column (~70%)
    const DARK  = "0F172A"
    const BLUE  = "2563EB"
    const LGRAY = "F8FAFC"
    const MGRAY = "E2E8F0"
    const TEXT  = "0F172A"
    const MUTED = "64748B"
    const WHITE = "FFFFFF"

    const thinBorder  = { style: BorderStyle.SINGLE, size: 1, color: MGRAY }
    const allBorders  = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
    const noneB       = { style: BorderStyle.NONE, size: 0, color: WHITE }
    const noBorders   = { top: noneB, bottom: noneB, left: noneB, right: noneB, insideH: noneB, insideV: noneB }
    const pad         = { top: 100, bottom: 100, left: 160, right: 160 }
    const padSm       = { top: 60,  bottom: 60,  left: 160, right: 160 }

    // Section header row (dark background)
    const sectionHdr = (title) => new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [W],
      rows: [new TableRow({ children: [
        new TableCell({
          borders: noBorders,
          width: { size: W, type: WidthType.DXA },
          shading: { fill: DARK, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 200, right: 200 },
          children: [new Paragraph({ children: [
            new TextRun({ text: title, bold: true, size: 22, color: WHITE, font: "Arial" })
          ]})]
        })
      ]})]
    })

    // Sub-header row (blue background)
    const subHdr = (title) => new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [W],
      rows: [new TableRow({ children: [
        new TableCell({
          borders: noBorders,
          width: { size: W, type: WidthType.DXA },
          shading: { fill: BLUE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 200, right: 200 },
          children: [new Paragraph({ children: [
            new TextRun({ text: title, bold: true, size: 18, color: WHITE, font: "Arial" })
          ]})]
        })
      ]})]
    })

    // Data table — array of [label, value] pairs
    const dataTable = (pairs) => new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [COL_L, COL_V],
      rows: pairs.map(([label, value], idx) => new TableRow({ children: [
        new TableCell({
          borders: allBorders,
          width: { size: COL_L, type: WidthType.DXA },
          shading: { fill: LGRAY, type: ShadingType.CLEAR },
          margins: padSm,
          children: [new Paragraph({ children: [
            new TextRun({ text: label, bold: true, size: 18, font: "Arial", color: MUTED })
          ]})]
        }),
        new TableCell({
          borders: allBorders,
          width: { size: COL_V, type: WidthType.DXA },
          margins: padSm,
          children: [new Paragraph({ children: [
            new TextRun({ text: safe(value), size: 18, font: "Arial", color: TEXT })
          ]})]
        })
      ]}))
    })

    // Multi-column table for wide data (e.g. damaged areas)
    const multiTable = (headers, colWidths, rows) => {
      const hdrRow = new TableRow({ children: headers.map((h, i) =>
        new TableCell({
          borders: allBorders,
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: MGRAY, type: ShadingType.CLEAR },
          margins: padSm,
          children: [new Paragraph({ children: [
            new TextRun({ text: h, bold: true, size: 18, font: "Arial", color: MUTED })
          ]})]
        })
      )})
      const dataRows = rows.map(cells => new TableRow({ children: cells.map((c, i) =>
        new TableCell({
          borders: allBorders,
          width: { size: colWidths[i], type: WidthType.DXA },
          margins: padSm,
          children: [new Paragraph({ children: [
            new TextRun({ text: safe(c), size: 18, font: "Arial" })
          ]})]
        })
      )}))
      return new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [hdrRow, ...dataRows]
      })
    }

    const gap = (n = 160) => new Paragraph({ spacing: { before: n, after: 0 }, children: [] })

    const [rows] = await db.query(`
      SELECT
        i.inspection_id, i.file_number, i.date, i.date_of_incident,
        i.policy_number, i.claim_number, i.type_of_case,
        i.claimant_name, i.claimant_phone, i.claimant_email,
        i.insurer_name, i.insurer_other, i.other_rep, i.other_rep_email, i.other_rep_phone,
        i.type_of_loss, i.details_of_loss, i.inspection_date, i.other_info,
        s.incident_ref, s.field_adjuster, s.internal_adjuster,
        s.visit_date, s.visit_time, s.persons_present, s.contact_numbers,
        s.gdpr_obtained, s.gdpr_reason, s.adjuster_notes AS site_notes,
        ins.policyholder_name_dob, ins.occupation, ins.address AS insured_address,
        ins.period_of_residence, ins.previous_addresses, ins.period_on_cover,
        ins.previous_insurers, ins.previous_claim_1, ins.previous_claim_2, ins.previous_claim_3,
        ins.convictions, ins.other_occupiers, ins.adjuster_notes AS insured_notes,
        pr.property_type, pr.storeys, pr.bedrooms, pr.roof, pr.basement_attic,
        pr.date_of_construction, pr.listing_status, pr.maintenance_standard, pr.ownership_status,
        pt.front_door_lock_make, pt.front_door_lock_type,
        pt.rear_door_lock_make, pt.rear_door_lock_type,
        pt.side_door_lock_make, pt.side_door_lock_type,
        pt.alarm_details, pt.recommendations, pt.risk_issues,
        pt.warranties_complied, pt.warranties_notes, pt.adjuster_notes AS prot_notes,
        dv.discovered_datetime, dv.discovered_by, dv.last_occupied,
        dv.operating_peril, dv.circumstances, dv.causation_issues,
        dv.evidence, dv.adjuster_notes AS disc_notes,
        th.occupants_prior, th.last_to_leave, th.fully_secured,
        th.method_of_entry, th.method_of_exit, th.force_evidence,
        th.crn, th.police_station, th.police_report_required, th.adjuster_notes AS theft_notes,
        bl.damaged_areas, bl.room_damage, bl.damage_consistent,
        bl.betterment, bl.maintenance, bl.actions_quantum, bl.adjuster_notes AS bldg_notes,
        ct.items AS contents_items, ct.total_amount,
        ct.proof_of_ownership, ct.specialist_reports, ct.adjuster_notes AS cont_notes,
        ac.uninhabitable, ac.uninhabitable_details, ac.who_lives_there,
        ac.alternatives_discussed, ac.disruption_period, ac.cessation_of_rent,
        ac.further_actions, ac.adjuster_notes AS accom_notes,
        si.buildings_sum, si.buildings_var, si.additional_var, si.buildings_adequacy,
        si.buildings_notes, si.sketch_plan, si.contents_sum, si.room_breakdown,
        si.basis_of_valuation, si.contents_adequacy, si.contents_notes,
        rc.responsible_party, rc.other_concerns, rc.claim_status, rc.enquiries_required,
        rc.claim_summary, rc.reserve_buildings, rc.reserve_trade_contents,
        rc.reserve_stock, rc.reserve_machinery, rc.reserve_bi, rc.reserve_other,
        rc.action_issues, rc.action_adjuster, rc.action_policyholder, rc.action_notes
      FROM inspections i
      LEFT JOIN inspection_site         s   ON s.inspection_id   = i.inspection_id
      LEFT JOIN inspection_insured      ins ON ins.inspection_id = i.inspection_id
      LEFT JOIN inspection_premises     pr  ON pr.inspection_id  = i.inspection_id
      LEFT JOIN inspection_protections  pt  ON pt.inspection_id  = i.inspection_id
      LEFT JOIN inspection_discovery    dv  ON dv.inspection_id  = i.inspection_id
      LEFT JOIN inspection_theft        th  ON th.inspection_id  = i.inspection_id
      LEFT JOIN inspection_buildings    bl  ON bl.inspection_id  = i.inspection_id
      LEFT JOIN inspection_contents     ct  ON ct.inspection_id  = i.inspection_id
      LEFT JOIN inspection_accommodation ac ON ac.inspection_id  = i.inspection_id
      LEFT JOIN inspection_sum_insured  si  ON si.inspection_id  = i.inspection_id
      LEFT JOIN inspection_recovery     rc  ON rc.inspection_id  = i.inspection_id
      WHERE i.inspection_id = ?
    `, [id])

    if (!rows.length) return res.status(404).send("Inspection not found")
    const d = rows[0]

    // Parse JSON fields
    let damagedAreas = []
    let contentsItems = []
    try { damagedAreas  = JSON.parse(d.damaged_areas  || "[]") } catch {}
    try { contentsItems = JSON.parse(d.contents_items || "[]") } catch {}

    // ── Cover title ──────────────────────────────────────────
    const titlePara = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 80 },
      children: [new TextRun({ text: "INSPECTION REPORT", bold: true, size: 48, font: "Arial", color: DARK })]
    })
    const subtitlePara = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: `File No: ${safe(d.file_number)}  |  Inspection #${id}  |  ${safe(d.date)}`, size: 20, font: "Arial", color: MUTED })]
    })
    const dividerLine = new Paragraph({
      spacing: { after: 280 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
      children: []
    })

    // ── Cover summary table ───────────────────────────────────
    const H2 = 2256   // half width
    const coverTable = new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [H2, H2],
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: H2, type: WidthType.DXA }, margins: pad,
            children: [new Paragraph({ children: [new TextRun({ text: "Claimant", bold: true, size: 18, font: "Arial", color: MUTED })] })] }),
          new TableCell({ borders: noBorders, width: { size: H2, type: WidthType.DXA }, margins: pad,
            children: [new Paragraph({ children: [new TextRun({ text: "Insurer", bold: true, size: 18, font: "Arial", color: MUTED })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: { bottom: thinBorder, top: noneB, left: noneB, right: noneB }, width: { size: H2, type: WidthType.DXA }, margins: { ...pad, bottom: 160 },
            children: [new Paragraph({ children: [new TextRun({ text: safe(d.claimant_name), bold: true, size: 24, font: "Arial", color: DARK })] })] }),
          new TableCell({ borders: { bottom: thinBorder, top: noneB, left: noneB, right: noneB }, width: { size: H2, type: WidthType.DXA }, margins: { ...pad, bottom: 160 },
            children: [new Paragraph({ children: [new TextRun({ text: safe(d.insurer_name), bold: true, size: 24, font: "Arial", color: DARK })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: H2, type: WidthType.DXA }, margins: { ...pad, top: 160 },
            children: [new Paragraph({ children: [new TextRun({ text: `Policy: ${safe(d.policy_number)}`, size: 18, font: "Arial", color: MUTED })] })] }),
          new TableCell({ borders: noBorders, width: { size: H2, type: WidthType.DXA }, margins: { ...pad, top: 160 },
            children: [new Paragraph({ children: [new TextRun({ text: `Type: ${safe(d.type_of_case)}`, size: 18, font: "Arial", color: MUTED })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: H2, type: WidthType.DXA }, margins: pad,
            children: [new Paragraph({ children: [new TextRun({ text: `Date of Incident: ${safe(d.date_of_incident)}`, size: 18, font: "Arial", color: MUTED })] })] }),
          new TableCell({ borders: noBorders, width: { size: H2, type: WidthType.DXA }, margins: pad,
            children: [new Paragraph({ children: [new TextRun({ text: `Type of Loss: ${safe(d.type_of_loss)}`, size: 18, font: "Arial", color: MUTED })] })] }),
        ]}),
      ]
    })

    // ── Buildings damaged areas table ────────────────────────
    const areasCols = [2406, 1655, 1655, 1655, 1655]  // Area | L | W | H | total=9026
    const areasTable = damagedAreas.length ? multiTable(
      ["Area", "Length", "Width", "Height", "Notes"],
      areasCols,
      damagedAreas.map(a => [a.area, a.length, a.width, a.height, ""])
    ) : null

    // ── Contents items table ─────────────────────────────────
    const contCols = [3510, 3510, 2006]  // Item | Description | Amount
    const contTable = contentsItems.length ? multiTable(
      ["Item", "Description", "Amount (€)"],
      contCols,
      contentsItems.map(it => [it.item, it.description, it.amount])
    ) : null

    // ── Reserve table ────────────────────────────────────────
    const resCols = [3012, 3012, 3002]
    const reserveTable = multiTable(
      ["Category", "Amount (€)", "Notes"],
      resCols,
      [
        ["Buildings",      d.reserve_buildings      || "—", ""],
        ["Trade Contents", d.reserve_trade_contents || "—", ""],
        ["Stock",          d.reserve_stock          || "—", ""],
        ["Machinery",      d.reserve_machinery      || "—", ""],
        ["BI",             d.reserve_bi             || "—", ""],
        ["Other",          d.reserve_other          || "—", ""],
      ]
    )

    // ── Build children array ──────────────────────────────────
    const children = [
      titlePara,
      subtitlePara,
      dividerLine,
      coverTable,
      gap(320),

      // 1. CLAIM & BASIC INFO
      sectionHdr("1.  Claim & Basic Info"),
      gap(60),
      dataTable([
        ["File Number",      d.file_number],
        ["Date",             d.date],
        ["Date of Incident", d.date_of_incident],
        ["Inspection Date",  d.inspection_date],
        ["Policy Number",    d.policy_number],
        ["Claim Number",     d.claim_number],
        ["Type of Case",     d.type_of_case],
        ["Type of Loss",     d.type_of_loss],
      ]),
      gap(60),
      dataTable([
        ["Claimant Name",    d.claimant_name],
        ["Phone",            d.claimant_phone],
        ["Email",            d.claimant_email],
        ["Insurer",          d.insurer_name],
        ["Other Rep",        d.other_rep],
        ["Other Rep Email",  d.other_rep_email],
        ["Other Rep Phone",  d.other_rep_phone],
      ]),
      gap(60),
      dataTable([
        ["Details of Loss",  d.details_of_loss],
        ["Other Info",       d.other_info],
      ]),
      gap(240),

      // 2. SITE VISIT
      sectionHdr("2.  Site Visit Info"),
      gap(60),
      dataTable([
        ["Field Adjuster",    d.field_adjuster],
        ["Internal Adjuster", d.internal_adjuster],
        ["Visit Date",        d.visit_date],
        ["Visit Time",        d.visit_time],
        ["Persons Present",   d.persons_present],
        ["Contact Numbers",   d.contact_numbers],
        ["GDPR Obtained",     d.gdpr_obtained],
        ["GDPR Reason",       d.gdpr_reason],
        ["Notes",             d.site_notes],
      ]),
      gap(240),

      // 3. THE INSURED
      sectionHdr("3.  The Insured"),
      gap(60),
      dataTable([
        ["Policyholder / DOB",   d.policyholder_name_dob],
        ["Occupation",           d.occupation],
        ["Address",              d.insured_address],
        ["Period of Residence",  d.period_of_residence],
        ["Previous Addresses",   d.previous_addresses],
        ["Period on Cover",      d.period_on_cover],
        ["Previous Insurers",    d.previous_insurers],
        ["Previous Claim 1",     d.previous_claim_1],
        ["Previous Claim 2",     d.previous_claim_2],
        ["Previous Claim 3",     d.previous_claim_3],
        ["Convictions",          d.convictions],
        ["Other Occupiers",      d.other_occupiers],
        ["Notes",                d.insured_notes],
      ]),
      gap(240),

      // 4. PREMISES
      sectionHdr("4.  The Premises"),
      gap(60),
      dataTable([
        ["Property Type",         d.property_type],
        ["Storeys",               d.storeys],
        ["Bedrooms",              d.bedrooms],
        ["Roof",                  d.roof],
        ["Basement / Attic",      d.basement_attic],
        ["Date of Construction",  d.date_of_construction],
        ["Listing Status",        d.listing_status],
        ["Maintenance Standard",  d.maintenance_standard],
        ["Ownership Status",      d.ownership_status],
      ]),
      gap(240),

      // 5. PROTECTIONS
      sectionHdr("5.  Protections"),
      gap(60),
      subHdr("Door Locks"),
      gap(40),
      multiTable(
        ["Door",             "Lock Make",                 "Lock Type"],
        [3008, 3009, 3009],
        [
          ["Front Door",         d.front_door_lock_make,      d.front_door_lock_type],
          ["Rear Door",          d.rear_door_lock_make,       d.rear_door_lock_type],
          ["Side Door",          d.side_door_lock_make,       d.side_door_lock_type],
        ]
      ),
      gap(80),
      subHdr("General"),
      gap(40),
      dataTable([
        ["Alarm Details",      d.alarm_details],
        ["Recommendations",    d.recommendations],
        ["Risk Issues",        d.risk_issues],
        ["Warranties Complied",d.warranties_complied],
        ["Warranties Notes",   d.warranties_notes],
        ["Notes",              d.prot_notes],
      ]),
      gap(240),

      // 6. DISCOVERY
      sectionHdr("6.  Discovery & Perils"),
      gap(60),
      dataTable([
        ["Discovered",         d.discovered_datetime],
        ["Discovered By",      d.discovered_by],
        ["Last Occupied",      d.last_occupied],
        ["Operating Peril",    d.operating_peril],
        ["Circumstances",      d.circumstances],
        ["Causation Issues",   d.causation_issues],
        ["Evidence",           d.evidence],
        ["Notes",              d.disc_notes],
      ]),
      gap(240),

      // 7. THEFT
      sectionHdr("7.  Theft / Malicious Damage"),
      gap(60),
      dataTable([
        ["Occupants Prior",      d.occupants_prior],
        ["Last to Leave",        d.last_to_leave],
        ["Fully Secured",        d.fully_secured],
        ["Method of Entry",      d.method_of_entry],
        ["Method of Exit",       d.method_of_exit],
        ["Force Evidence",       d.force_evidence],
        ["CRN",                  d.crn],
        ["Police Station",       d.police_station],
        ["Police Report Req.",   d.police_report_required],
        ["Notes",                d.theft_notes],
      ]),
      gap(240),

      // 8. BUILDINGS
      sectionHdr("8.  Buildings (FNQ)"),
      gap(60),
      ...(areasTable ? [subHdr("Damaged Areas"), gap(40), areasTable, gap(80)] : []),
      dataTable([
        ["Damage Consistent",  d.damage_consistent],
        ["Betterment",         d.betterment],
        ["Maintenance",        d.maintenance],
        ["Actions / Quantum",  d.actions_quantum],
        ["Notes",              d.bldg_notes],
      ]),
      gap(240),

      // 9. CONTENTS
      sectionHdr("9.  Contents"),
      gap(60),
      ...(contTable ? [subHdr("Items"), gap(40), contTable, gap(80)] : []),
      dataTable([
        ["Total Amount",       d.total_amount ? `€${d.total_amount}` : ""],
        ["Proof of Ownership", d.proof_of_ownership],
        ["Specialist Reports", d.specialist_reports],
        ["Notes",              d.cont_notes],
      ]),
      gap(240),

      // 10. ACCOMMODATION
      sectionHdr("10.  Alternative Accommodation"),
      gap(60),
      dataTable([
        ["Uninhabitable",           d.uninhabitable],
        ["Details",                 d.uninhabitable_details],
        ["Who Lives There",         d.who_lives_there],
        ["Alternatives Discussed",  d.alternatives_discussed],
        ["Disruption Period",       d.disruption_period],
        ["Cessation of Rent",       d.cessation_of_rent],
        ["Further Actions",         d.further_actions],
        ["Notes",                   d.accom_notes],
      ]),
      gap(240),

      // 11. SUM INSURED
      sectionHdr("11.  Sum Insured"),
      gap(60),
      subHdr("Buildings"),
      gap(40),
      dataTable([
        ["Buildings Sum",      d.buildings_sum  ? `€${d.buildings_sum}`  : ""],
        ["Buildings Variance", d.buildings_var  ? `€${d.buildings_var}`  : ""],
        ["Additional Variance",d.additional_var ? `€${d.additional_var}` : ""],
        ["Buildings Adequacy", d.buildings_adequacy],
        ["Notes",              d.buildings_notes],
      ]),
      gap(80),
      subHdr("Contents"),
      gap(40),
      dataTable([
        ["Contents Sum",       d.contents_sum ? `€${d.contents_sum}` : ""],
        ["Basis of Valuation", d.basis_of_valuation],
        ["Contents Adequacy",  d.contents_adequacy],
        ["Notes",              d.contents_notes],
      ]),
      gap(240),

      // 12. RECOVERY
      sectionHdr("12.  Recovery & End of Visit"),
      gap(60),
      dataTable([
        ["Responsible Party",  d.responsible_party],
        ["Claim Status",       d.claim_status],
        ["Claim Summary",      d.claim_summary],
        ["Enquiries Required", d.enquiries_required],
        ["Other Concerns",     d.other_concerns],
      ]),
      gap(80),
      subHdr("Reserve"),
      gap(40),
      reserveTable,
      gap(80),
      subHdr("Action Plan"),
      gap(40),
      dataTable([
        ["Issues",              d.action_issues],
        ["Adjuster Actions",    d.action_adjuster],
        ["Policyholder Actions",d.action_policyholder],
        ["Notes",               d.action_notes],
      ]),
      gap(240),
    ]

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 }
          }
        },
        headers: {
          default: new Header({ children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: MGRAY, space: 1 } },
              children: [
                new TextRun({ text: "ONYR Insurance", bold: true, size: 18, font: "Arial", color: DARK }),
                new TextRun({ text: `  |  Inspection Report #${id}`, size: 18, font: "Arial", color: MUTED }),
              ]
            })
          ]})
        },
        footers: {
          default: new Footer({ children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: MGRAY, space: 1 } },
              children: [
                new TextRun({ text: "Page ", size: 16, font: "Arial", color: MUTED }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: MUTED }),
                new TextRun({ text: " of ", size: 16, font: "Arial", color: MUTED }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: "Arial", color: MUTED }),
              ]
            })
          ]})
        },
        children
      }]
    })
    const buffer = await Packer.toBuffer(doc)
    res.setHeader("Content-Disposition", `attachment; filename=inspection_${id}.docx`)
    res.send(buffer)
  } catch (err) {
    console.error("INSPECTION DOC ERROR:", err)
    res.status(500).send(err.message)
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
