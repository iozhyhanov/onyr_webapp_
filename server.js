import express from "express"
import mysql from "mysql2"
import cors from "cors"

const app = express()

// ✅ middleware (ОБЯЗАТЕЛЬНО)
app.use(cors())
app.use(express.json())

// 🔥 ЛОГ ВСЕХ ЗАПРОСОВ (чтобы видеть что реально приходит)
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url)
  next()
})

// 🔌 MariaDB connection
const db = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "123",
  database: "onyrdb"
})

// ✅ проверка подключения к базе
db.connect((err) => {
  if (err) {
    console.error("❌ DB ERROR:", err)
  } else {
    console.log("✅ MariaDB connected")
  }
})

// 🧪 тестовый маршрут
app.get("/", (req, res) => {
  res.send("Backend работает 🚀")
})

// 📩 CREATE customer
app.post("/api/customers", (req, res) => {
  console.log("BODY:", req.body)

  const data = req.body

  const sql = `
    INSERT INTO customers 
    (first_name, last_name, date_of_birth, phone, email, address_line, city, postcode, country)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  const values = [
    data.first_name,
    data.last_name,
    data.date_of_birth,
    data.phone,
    data.email,
    data.address_line,
    data.city,
    data.postcode,
    data.country
  ]

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ DB ERROR:", err)
      return res.status(500).json({
        error: "DB error",
        details: err.message
      })
    }

    res.json({
      message: "Customer erstellt ✅",
      customer_id: result.insertId
    })
  })
})

// 📥 GET all customers (для проверки)
app.get("/api/customers", (req, res) => {
  db.query("SELECT * FROM customers", (err, result) => {
    if (err) {
      console.error("❌ DB ERROR:", err)
      return res.status(500).json({ error: err.message })
    }

    res.json(result)
  })
})

// ▶️ start server
app.listen(3000, () => {
  console.log("🚀 Server läuft auf http://localhost:3000")
})