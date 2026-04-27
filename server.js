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
      customers.country

    FROM claims
    JOIN customers 
      ON claims.customer_id = customers.customer_id
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

// app.get("/api/claims/:id/doc", async (req, res) => {
//   try {
//     const id = req.params.id

//     const [rows] = await db.query(`
//       SELECT 
//         claims.claim_id,
//         claims.insurer_name,
//         claims.policy_number,
//         claims.policy_type,
//         claims.date_of_loss,

//         customers.first_name,
//         customers.last_name,
//         customers.phone,
//         customers.email,
//         customers.address_line,
//         customers.city,
//         customers.postcode,
//         customers.country

//       FROM claims
//       JOIN customers 
//         ON claims.customer_id = customers.customer_id
//       WHERE claims.claim_id = ?
//     `, [id])

//     const data = rows[0]

//     if (!data) {
//       return res.status(404).send("Claim not found")
//     }

//     const __filename = fileURLToPath(import.meta.url)
//     const __dirname = path.dirname(__filename)

//     const templatePath = path.join(__dirname, "template.docx")

//     console.log("TEMPLATE PATH:", templatePath)

//     const content = fs.readFileSync(templatePath, "binary")
//     const zip = new PizZip(content)
//     const doc = new Docxtemplater(zip)

//     doc.setData({
//       claim_id: data.claim_id,
//       first_name: data.first_name,
//       last_name: data.last_name,
//       phone: data.phone,
//       email: data.email,
//       address_line: data.address_line,
//       city: data.city,
//       postcode: data.postcode,
//       country: data.country,
//       insurer_name: data.insurer_name,
//       policy_number: data.policy_number,
//       policy_type: data.policy_type,
//       date_of_loss: new Date(data.date_of_loss).toISOString().split("T")[0]
//     })

//     try {
//       doc.render()
//     } catch (error) {
//       console.error("DOC TEMPLATE ERROR:", error)
//       return res.status(500).send("Template error")
//     }

//     const buffer = doc.getZip().generate({ type: "nodebuffer" })

//     res.setHeader("Content-Disposition", "attachment; filename=fnol.docx")
//     res.send(buffer)

//   } catch (err) {
//     console.error("DOC ERROR:", err)
//     res.status(500).send(err.message)
//   }
// })

app.get("/api/claims/:id/doc", async (req, res) => {
  try {
    const id = req.params.id

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph(`Claim ID: ${id}`),
            new Paragraph(""),
            new Paragraph("Date of Loss: 2026-04-27"),
            new Paragraph(""),
            new Paragraph("Name: John Doe"),
            new Paragraph("Phone: +123456789"),
            new Paragraph("Email: john@test.com"),
            new Paragraph(""),
            new Paragraph("Address:"),
            new Paragraph("Main Street 1"),
            new Paragraph("Dublin, D02, Ireland"),
            new Paragraph(""),
            new Paragraph("Insurer: AXA"),
            new Paragraph("Policy Number: POL123"),
            new Paragraph("Policy Type: Home"),
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



// ▶ start server
app.listen(5000, () => {
  console.log("Server läuft auf http://localhost:5000")
})
