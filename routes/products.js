const express = require("express");
const verifyAuth = require("../middleware/auth");
const { db } = require("../firebase");
const PDFDocument = require("pdfkit");


const router = express.Router();

/* ================= GET ALL PRODUCTS ================= */

router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("products")
      .orderBy("createdAt", "desc")
      .get();

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(products);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= ADD PRODUCT ================= */

router.post("/", async (req, res) => {
  try {

    const productName = req.body.name?.trim();

    if (!productName) {
      return res.status(400).json({ message: "Product name is required" });
    }

    // 🔍 Check if product already exists
    const snapshot = await db.collection("products")
      .where("name", "==", productName)
      .get();

    const productData = {
      name: productName,
      mrp: Number(req.body.mrp || 0),
      ptr: Number(req.body.ptr || 0),
      salePrice: Number(req.body.salePrice || 0),
      ptrTablet: Number(req.body.ptrTablet || 0),
      saleTablet: Number(req.body.saleTablet || 0),
      packing: String(req.body.packing || ""),
      gst: Number(req.body.gst || 0),
      type: String(req.body.type || ""),
      hsn: String(req.body.hsn || ""),
      batchNo: String(req.body.batchNo || ""),
      expiry: String(req.body.expiry || ""),
      stock: Number(req.body.stock || 0),
      isActive: true,
      updatedAt: new Date()
    };

    // 🟢 CREATE NEW
    if (snapshot.empty) {

      const doc = await db.collection("products").add({
        ...productData,
        createdAt: new Date()
      });

      return res.json({
        message: "Product created",
        id: doc.id,
        action: "created"
      });
    }

    // 🔄 UPDATE EXISTING
    const existingDoc = snapshot.docs[0];
    await existingDoc.ref.update(productData);

    return res.json({
      message: "Product updated",
      id: existingDoc.id,
      action: "updated"
    });

  } catch (err) {
    console.error("ADD/UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});


/* ================= TOGGLE STATUS ================= */

router.patch("/:id/status", async (req, res) => {
  try {
    const ref = db.collection("products").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists)
      return res.status(404).json({ message: "Not found" });

    await ref.update({
      isActive: !doc.data().isActive
    });

    res.json({ message: "Updated" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= PRODUCT PDF ================= */

router.get("/:id/pdf", verifyAuth, async (req, res) => {
  try {

    const docSnap = await db.collection("products")
      .doc(req.params.id)
      .get();

    if (!docSnap.exists)
      return res.status(404).json({ message: "Not found" });

    const p = docSnap.data();

    const pdf = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=product-${p.name}.pdf`
    );

    pdf.pipe(res);

    pdf.fontSize(18).text("SHIVA BALAJI MEDICAL", { align: "center" });
    pdf.moveDown(2);

    pdf.fontSize(12);
    pdf.text(`Product Name: ${p.name}`);
    pdf.text(`MRP: ₹ ${p.mrp}`);
    pdf.text(`PTR: ₹ ${p.ptr}`);
    pdf.text(`Sale Price: ₹ ${p.salePrice}`);
    pdf.text(`PTR Tablet: ₹ ${p.ptrTablet}`);
    pdf.text(`Sale Tablet: ₹ ${p.saleTablet}`);
    pdf.text(`Packing: ${p.packing}`);
    pdf.text(`GST: ${p.gst}%`);
    pdf.text(`Type: ${p.type}`);
    pdf.text(`HSN: ${p.hsn}`);
    pdf.text(`Batch No: ${p.batchNo}`);
    pdf.text(`Expiry: ${p.expiry}`);
    pdf.text(`Stock: ${p.stock}`);

    pdf.end();

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
/* ================= TOGGLE PRODUCT STATUS ================= */

router.patch("/:id/status", async (req, res) => {
  try {
    const productRef = db.collection("products").doc(req.params.id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Product not found" });
    }

    const currentStatus = doc.data().isActive ?? true;

    await productRef.update({
      isActive: !currentStatus
    });

    res.json({ message: "Status updated successfully" });

  } catch (error) {
    console.error("Status toggle error:", error);
    res.status(500).json({ message: error.message });
  }
});

/* ==================================Delete=============================*/
router.delete("/:id", async (req, res) => {
  try {
    await db.collection("products").doc(req.params.id).delete();
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});
module.exports = router;
