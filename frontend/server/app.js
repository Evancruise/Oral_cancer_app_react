import express from "express";
import cors from "cors";

const app = express();
const PORT = 5000;

// 中介層
app.use(cors());
app.use(express.json());

// 測試 API
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// 範例 API (歷史紀錄)
app.get("/history", (req, res) => {
  res.json([
    { date: "2025-09-05", user: "test1", status: "done" },
    { date: "2025-09-04", user: "doctor_b", status: "pending" }
  ]);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});