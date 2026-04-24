import express from "express"
import mysql from "mysql2/promise"
import cors from "cors"

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
    console.error("❌ DB ERROR:", err)
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
    console.error("❌ UPDATE ERROR:", err)
    res.status(500).json({ error: err.message })

  } finally {
    connection.release()
  }
})

// ▶ start server
app.listen(5000, () => {
  console.log("Server läuft auf http://localhost:5000")
})
