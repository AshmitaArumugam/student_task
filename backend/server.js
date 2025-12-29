const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

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
   USERS
===================================================== */

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.json({ success: false });

  db.query(
    "INSERT INTO users (name,email,password) VALUES (?,?,?)",
    [name, email, password],
    err => {
      if (err) return res.json({ success: false });
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
        return res.json({ success: false });

      if (rows[0].password !== password)
        return res.json({ success: false });

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
   SKILLS
===================================================== */

app.post("/skills/add", (req, res) => {
  const { user_id, name } = req.body;

  db.query(
    "INSERT INTO skills (user_id,name) VALUES (?,?)",
    [user_id, name],
    err => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

app.get("/skills/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT s.id skill_id, s.name skill_name,
           t.id topic_id, t.name topic_name, t.status
    FROM skills s
    LEFT JOIN topics t ON s.id = t.skill_id
    WHERE s.user_id=?
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.json([]);

    const map = {};
    rows.forEach(r => {
      if (!map[r.skill_id]) {
        map[r.skill_id] = {
          id: r.skill_id,
          name: r.skill_name,
          topics: []
        };
      }
      if (r.topic_id) {
        map[r.skill_id].topics.push({
          id: r.topic_id,
          name: r.topic_name,
          status: r.status
        });
      }
    });

    res.json(Object.values(map));
  });
});

/* =====================================================
   TOPICS
===================================================== */

app.post("/topics/add", (req, res) => {
  const { skill_id, name } = req.body;

  db.query(
    "INSERT INTO topics (skill_id,name) VALUES (?,?)",
    [skill_id, name],
    err => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

app.post("/topics/status", (req, res) => {
  const { topic_id, status } = req.body;

  db.query(
    "UPDATE topics SET status=? WHERE id=?",
    [status, topic_id],
    err => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

/* DELETE TOPIC */
app.post("/topics/delete", (req, res) => {
  const { topic_id } = req.body;

  db.query(
    "DELETE FROM topics WHERE id=?",
    [topic_id],
    err => {
      if (err) {
        console.log("Delete topic error:", err);
        return res.json({ success:false });
      }
      res.json({ success:true });
    }
  );
});

/* =====================================================
   PROGRESS  ✅ (KEY FIX)
===================================================== */

app.post("/progress", (req, res) => {
  const { userId } = req.body;

  const sql = `
    SELECT 
      s.id AS skill_id,
      s.name AS skill_name,
      COUNT(t.id) AS total,
      COALESCE(SUM(t.status='finished'), 0) AS completed
    FROM skills s
    LEFT JOIN topics t ON s.id = t.skill_id
    WHERE s.user_id = ?
    GROUP BY s.id
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.log("Progress error:", err);
      return res.json({
        skillCount: 0,
        topicCount: 0,
        completedCount: 0,
        activeDays: 0,
        skills: []
      });
    }

    let topicCount = 0;
    let completedCount = 0;

    rows.forEach(r => {
  topicCount += Number(r.total);
  completedCount += Number(r.completed);
});


    res.json({
      skillCount: rows.length,
      topicCount,
      completedCount,
      activeDays: 0,
      skills: rows
    });
  });
});

/* =====================================================
   TASKS
===================================================== */

// ADD TASK
app.post("/tasks/add", (req, res) => {
  const { user_id, task_date, text } = req.body;

  if (!user_id || !task_date || !text)
    return res.json({ success: false });

  db.query(
    "INSERT INTO tasks (user_id, task_date, text) VALUES (?,?,?)",
    [user_id, task_date, text],
    err => {
      if (err) {
        console.log("Task add error:", err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});


// TOGGLE TASK DONE
app.post("/tasks/toggle", (req, res) => {
  const { id, done } = req.body;

  const sql = `
    UPDATE tasks SET done = ?
    WHERE id = ?
  `;

  db.query(sql, [done, id], err => {
    if (err) {
      console.log("Toggle task error:", err);
      return res.json({ success: false });
    }
    res.json({ success: true });
  });
});

// GET TASKS FOR DAY
app.get("/tasks/:userId/:date", (req, res) => {
  const { userId, date } = req.params;

  const sql = `
    SELECT id, text, done 
    FROM tasks 
    WHERE user_id = ? AND task_date = ?
    ORDER BY id ASC
  `;

  db.query(sql, [userId, date], (err, rows) => {
    if (err) {
      console.log("Load tasks error:", err);
      return res.json([]);
    }
    res.json(rows);
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
