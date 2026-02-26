const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const { db } = require("./firebase");
const PDFDocument = require("pdfkit");

const app = express();

/* ================= CORS ================= */

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://sbm-pharmacy-system.web.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true
}));
app.options("*", cors());
app.use(express.json());

/* ================= ROUTES ================= */

app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/returns", require("./routes/returns"));
app.use("/api/reports", require("./routes/reports"));

/* ================= HEALTH CHECK ================= */

app.get("/api/health", (req, res) => {
  res.json({ status: "Backend running successfully ✅" });
});

/* =========================================================
   🔥 THERMAL PDF RECEIPT ROUTE (80mm OPTIMIZED)
========================================================= */

app.get("/api/bills/:id/pdf", async (req, res) => {
  try {
    const billSnap = await db.collection("bills").doc(req.params.id).get();

    if (!billSnap.exists) {
      return res.status(404).json({ error: "Bill not found" });
    }

    const bill = billSnap.data();

    // ✅ Smaller height (auto grows if needed)
    const doc = new PDFDocument({
      size: [226, 600],
      margins: { top: 15, bottom: 15, left: 15, right: 15 }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${bill.billNo}.pdf`
    );

    doc.pipe(res);

    /* ================= HEADER ================= */

    const logoPath = path.join(__dirname, "logo.png");

    try {
      const logoWidth = 60;
      const centerX = (doc.page.width - logoWidth) / 2;
      const logoY = doc.y;

      doc.image(logoPath, centerX, logoY, { width: logoWidth });

      doc.y = logoY + logoWidth + 8;
    } catch (err) {
      console.log("Logo not found");
    }

    doc.fontSize(11)
       .font("Helvetica-Bold")
       .text("SHIVA BALAJI MEDICAL", { align: "center" });

    doc.moveDown(0.3);

    doc.fontSize(8)
       .font("Helvetica")
       .text(
         "2-20-3/6/1/NR, Opp VK Steels,\nAdarsh Nagar, Uppal, Hyderabad - 500039",
         { align: "center" }
       );

    doc.text("Ph: 9700032524", { align: "center" });

    doc.moveDown(0.5);
    doc.text("-------------------------------------------------------------------------", { align: "center" });
    doc.moveDown(0.5);

    /* ================= BILL INFO ================= */

    doc.fontSize(8).font("Helvetica");

    doc.text(`Bill No: ${bill.billNo}`);
    doc.text(`Mobile: ${bill.customerMobile || "-"}`);
    doc.text(`Payment: ${bill.paymentMethod}`);

    const billDate = new Date(
      bill.createdAt?.seconds
        ? bill.createdAt.seconds * 1000
        : Date.now()
    ).toLocaleString("en-IN");

    doc.text(`Date: ${billDate}`);

    doc.moveDown(0.8);

/* ================= ULTRA THIN THERMAL TABLE ================= */

const tableWidth = 196;
const tableStartX = (doc.page.width - tableWidth) / 2;

const colNo = 15;
const colItem = 85;
const colQty = 20;
const colPrice = 30;
const colTotal = 35;

let y = doc.y;

doc.font("Helvetica-Bold").fontSize(8);

// Header
doc.text("No", tableStartX, y, { width: colNo });
doc.text("ITEM", tableStartX + colNo, y, { width: colItem });
doc.text("QTY", tableStartX + colNo + colItem, y, { width: colQty, align: "center" });
doc.text("PRICE", tableStartX + colNo + colItem + colQty, y, { width: colPrice, align: "right" });
doc.text("TOTAL", tableStartX + colNo + colItem + colQty + colPrice, y, { width: colTotal, align: "right" });

y += 12;

// Thin separator line
doc.moveTo(tableStartX, y)
   .lineTo(tableStartX + tableWidth, y)
   .stroke();

y += 6;

doc.font("Helvetica").fontSize(8);

let subTotal = 0;

bill.items?.forEach((item, index) => {

  const qty = Number(item.quantity || 0);
  const price = Number(item.unitCost || 0);
  const total = qty * price;

  subTotal += total;

  const itemHeight = doc.heightOfString(item.productName, {
    width: colItem
  });

  const rowHeight = Math.max(12, itemHeight + 4);

  doc.text(index + 1, tableStartX, y, { width: colNo });
  doc.text(item.productName, tableStartX + colNo, y, { width: colItem });
  doc.text(qty, tableStartX + colNo + colItem, y, { width: colQty, align: "center" });
  doc.text(price.toFixed(2), tableStartX + colNo + colItem + colQty, y, { width: colPrice, align: "right" });
  doc.text(total.toFixed(2), tableStartX + colNo + colItem + colQty + colPrice, y, { width: colTotal, align: "right" });

  y += rowHeight;
});

/* ================= TOTAL ================= */

y += 8;

doc.moveTo(tableStartX, y)
   .lineTo(tableStartX + tableWidth, y)
   .lineWidth(0.5)
   .stroke();

y += 6;

doc.font("Helvetica-Bold").fontSize(9);

// 1️⃣ Print TOTAL text (left side)
doc.text(
  "TOTAL",
  tableStartX,
  y,
  {
    width: tableWidth / 2,
    align: "left"
  }
);

// 2️⃣ Print amount separately (right side)
doc.text(
  subTotal.toFixed(2),   // ⚠ no ₹ symbol first
  tableStartX,
  y,
  {
    width: tableWidth,
    align: "right"
  }
);

y += 14;
    /* ================= FOOTER ================= */

y += 10;

doc.text("Thank You! Visit Again.", 0, y, {
  width: doc.page.width,
  align: "center"
});

y += 12;

doc.text("RenaskeR Tech Solutions.", 0, y, {
  width: doc.page.width,
  align: "center"
});

    doc.moveDown(1);
    doc.text("---------------------------------------------------------------------", { align: "center" });
    doc.moveDown(1);


	// 🔥 AUTO PAPER CUT
	doc.page.height = y + 20;

    doc.end();

  } catch (error) {
    console.error("🔥 PDF ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= GLOBAL ERROR HANDLER ================= */

app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);
  res.status(500).json({
    message: err.message || "Internal Server Error"
  });
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});