const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

/* ---------- DATABASE ---------- */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "User_16_",
  database: "student_app"
});

db.connect(err => {
  if (err) console.log("DB Error:", err);
  else console.log("MySQL Connected");
});

/* =====================================================
   USERS (REGISTER & LOGIN)
===================================================== */

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.json({ success: false, message: "All fields required" });

  db.query(
    "INSERT INTO users (name,email,password) VALUES (?,?,?)",
    [name, email, password],
    err => {
      if (err)
        return res.json({ success: false, message: "Email already exists" });
      res.json({ success: true });
    }
  );
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT id,name,email,password FROM users WHERE email=?",
    [email],
    (err, rows) => {
      if (rows.length === 0)
        return res.json({ success: false, message: "Invalid email" });

      if (rows[0].password !== password)
        return res.json({ success: false, message: "Wrong password" });

      res.json({
        success: true,
        user: {
          id: rows[0].id,
          name: rows[0].name,
          email: rows[0].email
        }
      });
    }
  );
});

/* =====================================================
   FORGOT PASSWORD (OTP FLOW)
===================================================== */

/* STEP 1 — SEND OTP */
app.post("/auth/send-otp", (req, res) => {
  const { email } = req.body;

  db.query("SELECT * FROM users WHERE email=?", [email], (err, rows) => {
    if (rows.length === 0)
      return res.json({ success: false, message: "Email not registered" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    db.query(
      "UPDATE users SET otp=?, otp_expiry=DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE email=?",
      [otp, email],
      err => {
        if (err) return res.json({ success: false });

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "ashmitaarumugam3@gmail.com",   // YOUR GMAIL
            pass: "evvp ojtq sxgn mwpn" // APP PASSWORD ONLY
          }
        });

        transporter.sendMail(
          {
            from: "Student App <ashmitaarumugam3@gmail.com>",
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP is ${otp}. It expires in 5 minutes.`
          },
          mailErr => {
            if (mailErr) {
              console.log("Mail Error:", mailErr);
              return res.json({ success: false, message: "Email sending failed" });
            }
            res.json({ success: true, message: "OTP sent to email" });
          }
        );
      }
    );
  });
});

/* STEP 2 — VERIFY OTP */
app.post("/auth/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  db.query(
    "SELECT * FROM users WHERE email=? AND otp=? AND otp_expiry > NOW()",
    [email, otp],
    (err, rows) => {
      if (rows.length === 0)
        return res.json({ success: false, message: "Invalid or expired OTP" });

      db.query(
        "UPDATE users SET otp=NULL, otp_expiry=NULL WHERE email=?",
        [email]
      );

      res.json({ success: true });
    }
  );
});

/* STEP 3 — RESET PASSWORD */
app.post("/auth/reset-password", (req, res) => {
  const { email, newPassword } = req.body;

  db.query(
    "UPDATE users SET password=? WHERE email=?",
    [newPassword, email],
    err => {
      if (err) return res.json({ success: false });

      res.json({ success: true, message: "Password updated" });
    }
  );
});

/* =====================================================
   SERVER START
===================================================== */

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
