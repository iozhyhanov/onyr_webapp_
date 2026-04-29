import express from "express"
import mysql from "mysql2/promise"
import cors from "cors"
import fs from "fs"
import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import path from "path"
import { fileURLToPath } from "url"
import { Document, Packer, Paragraph, TextRun } from "docx"


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
  host: "localhost",
  user: "root",
  password: "123",
  database: "onyrdb"
})

// test route
app.get("/", (req, res) => {
  res.send("Backend works")
})


   // HELPERS 

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
    data.first_name,
    data.last_name,
    formatDate(data.date_of_birth),
    data.phone,
    data.email,
    data.address_line,
    data.city,
    data.postcode,
    data.country
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
    customerId,
    data.insurer_name,
    data.policy_number,
    data.policy_type,
    formatDate(data.date_of_loss)
  ]

  const [result] = await connection.execute(sql, values)
  return result.insertId
}

// create customer + claim

app.post("/api/claims", async (req, res) => {
  const data = req.body
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const customerId = await createCustomer(connection, data)
    const claimId = await createClaim(connection, customerId, data)

    await connection.commit()

    res.json({
      message: "Claim + Customer created",
      claim_id: claimId,
      customer_id: customerId
    })

  } catch (err) {
    await connection.rollback()
    console.error("❌ ERROR:", err)

    res.status(500).json({
      error: err.message
    })

  } finally {
    connection.release()
  }
})

/* =========================
   GET ALL CLAIMS (JOIN)
========================= */

app.get("/api/claims", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        claims.claim_id,
        claims.insurer_name,
        claims.policy_number,
        claims.policy_type,
        claims.date_of_loss,
        claims.claim_status,

        customers.first_name,
        customers.last_name,
        customers.email,
        customers.phone,
        customers.date_of_birth,
        customers.address_line,
        customers.city,
        customers.postcode,
        customers.country,

        fnol.fnol_id

      FROM claims
      JOIN customers 
        ON claims.customer_id = customers.customer_id

      LEFT JOIN fnol
        ON fnol.claim_id = claims.claim_id

      ORDER BY claims.created_at DESC
    `)

    res.json(rows)

  } catch (err) {
    console.error("DB ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})


// edit function
app.put("/api/claims/:id", async (req, res) => {
  const claimId = req.params.id
  const data = req.body

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    // get customer_id
    const [rows] = await connection.execute(
      "SELECT customer_id FROM claims WHERE claim_id = ?",
      [claimId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: "Claim not found" })
    }

    const customerId = rows[0].customer_id

    // update customers
    await connection.execute(`
      UPDATE customers SET
        first_name = ?,
        last_name = ?,
        date_of_birth = ?,
        phone = ?,
        email = ?,
        address_line = ?,
        city = ?,
        postcode = ?,
        country = ?
      WHERE customer_id = ?
    `, [
      data.first_name,
      data.last_name,
      formatDate(data.date_of_birth),
      data.phone,
      data.email,
      data.address_line,
      data.city,
      data.postcode,
      data.country,
      customerId
    ])

    // update claims
    await connection.execute(`
      UPDATE claims SET
        insurer_name = ?,
        policy_number = ?,
        policy_type = ?,
        date_of_loss = ?,
        claim_status = ?
      WHERE claim_id = ?
    `, [
      data.insurer_name,
      data.policy_number,
      data.policy_type,
      formatDate(data.date_of_loss),
      data.claim_status,
      claimId
    ])

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


app.get("/api/claims/:id/doc", async (req, res) => {
  try {
    const id = req.params.id
    const safe = (v) => v || ""
    const [rows] = await db.query(`
      SELECT 
        claims.claim_id,
        claims.insurer_name,
        claims.policy_number,
        claims.policy_type,
        claims.date_of_loss,

        customers.first_name,
        customers.last_name,
        customers.phone,
        customers.email,
        customers.address_line,
        customers.city,
        customers.postcode,
        customers.country,

        fnol.loss_time,
        fnol.loss_location,
        fnol.loss_type,
        fnol.short_description,
        fnol.detailed_description,
        fnol.third_party_involved,
        fnol.police_report_number

      FROM claims
      JOIN customers 
        ON claims.customer_id = customers.customer_id

      LEFT JOIN fnol
        ON fnol.claim_id = claims.claim_id

      WHERE claims.claim_id = ?
    `, [id])

    const data = rows[0]

    if (!data) {
      return res.status(404).send("Claim not found")
    }

    const doc = new Document({
  sections: [
    {
      children: [

        // TITLE
        new Paragraph({
          alignment: "center",
          children: [
            new TextRun({ text: "FIRST NOTICE OF LOSS", bold: true, size: 32 })
          ]
        }),

        new Paragraph(""),

        // BASIC INFO
        new Paragraph({
          children: [
            new TextRun({ text: "File Number: ", bold: true }),
            new TextRun(String(data.claim_id))
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Date: ", bold: true }),
            new TextRun({
              text: new Date().toLocaleDateString("en-GB"),
              underline: {} // только дата
            })
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Date of Incident: ", bold: true }),
            new TextRun(formatDate(data.date_of_loss) || "")
          ]
        }),

        new Paragraph({
          border: { bottom: { value: "single", size: 6 } }
        }),

        new Paragraph(""),

        // CLAIMANT
        new Paragraph({
          children: [
            new TextRun({ text: "CLAIMANT DETAILS", bold: true, size: 26 })
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Name of Claimant: ", bold: true }),
            new TextRun(`${data.first_name} ${data.last_name}`)
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Contact number: ", bold: true }),
            new TextRun(safe(data.phone))
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Email: ", bold: true }),
            new TextRun(safe(data.email))
          ]
        }),

        new Paragraph(""),

        // INSURER
        new Paragraph({
          children: [
            new TextRun({ text: "INSURER DETAILS", bold: true, size: 26 })
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Name of Insurer: ", bold: true }),
            new TextRun(safe(data.insurer_name))
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "If other (Insurer): ", bold: true }),
            new TextRun("")
          ]
        }),

        new Paragraph(""),

        // POLICY
        new Paragraph({
          children: [
            new TextRun({ text: "POLICY DETAILS", bold: true, size: 26 })
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Type of case: ", bold: true }),
            new TextRun(safe(data.policy_type))
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Policy Number: ", bold: true }),
            new TextRun(safe(data.policy_number))
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Claim number: ", bold: true }),
            new TextRun(String(data.claim_id))
          ]
        }),

        new Paragraph(""),

        // REPRESENTATIVE
        new Paragraph({
          children: [
            new TextRun({ text: "REPRESENTATIVE", bold: true, size: 26 })
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Other representative: ", bold: true }),
            new TextRun(data.third_party_involved ? "Yes" : "No")
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "If Yes, Name: ", bold: true }),
            new TextRun("")
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "If Yes, Email: ", bold: true }),
            new TextRun("")
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "If Yes, Contact number: ", bold: true }),
            new TextRun("")
          ]
        }),

        new Paragraph(""),

        // LOSS
        new Paragraph({
          children: [
            new TextRun({ text: "LOSS DETAILS", bold: true, size: 26 })
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Type of loss: ", bold: true }),
            new TextRun(safe(data.loss_type))
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Details of loss: ", bold: true }),
            new TextRun(safe(data.detailed_description))
          ]
        }),

        new Paragraph(""),

        new Paragraph({
          children: [
            new TextRun({ text: "Inspection Date: ", bold: true }),
            new TextRun("")
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Other information: ", bold: true }),
            new TextRun(safe(data.short_description))
          ]
        }),

      ],
    },
  ],
})

    const buffer = await Packer.toBuffer(doc)

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=claim_${id}.docx`
    )

    res.send(buffer)

  } catch (err) {
    console.error(err)
    res.status(500).send(err.message)
  }
})

app.post("/api/fnol", async (req, res) => {
  const data = req.body
  const safe = (v) => v === undefined ? null : v

  try {
    const [result] = await db.execute(`
      INSERT INTO fnol (
        claim_id,
        loss_time,
        loss_location,
        loss_type,
        short_description,
        detailed_description,
        third_party_involved,
        police_report_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      safe(data.claim_id),
      safe(data.loss_time),
      safe(data.loss_location),
      safe(data.loss_type),
      safe(data.short_description),
      safe(data.detailed_description),
      safe(data.third_party_involved),
      safe(data.police_report_number)
    ])

    res.json({
      message: "FNOL created",
      id: result.insertId
    })

  } catch (err) {
    console.error("FNOL ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})


// ▶ start server
app.listen(5000, () => {
  console.log("Server läuft auf http://localhost:5000")
})
