import PDFDocument from "pdfkit";
import type { Response } from "express";
import QRCode from "qrcode";
import fs from "node:fs";
import path from "node:path";

const rupees = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const logoPath = () =>
  path.join(
    process.cwd(),
    "public",
    "brand",
    "logo-dark.jpg"
  );

export async function receiptPdf(
  res: Response,
  order: any
) {
  const branch = order.branch;

  const paperWidth =
    Number(branch?.receiptPaperWidth || 80) === 58
      ? 164
      : 226.77;

  const doc = new PDFDocument({
    size: [paperWidth, 980],
    margins: {
      top: 10,
      bottom: 12,
      left: 12,
      right: 12
    },
    autoFirstPage: true
  });

  const filename = String(
    order.invoiceNumber ||
      order.number ||
      "invoice"
  ).replace(/[^a-zA-Z0-9_-]/g, "_");

  res.setHeader(
    "Content-Type",
    "application/pdf"
  );

  res.setHeader(
    "Content-Disposition",
    `inline; filename="${filename}.pdf"`
  );

  doc.pipe(res);

  const center = (
    text: string,
    size = 8,
    bold = false
  ) => {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(size)
      .text(text, {
        align: "center"
      });
  };

  const separator = () => {
    doc
      .font("Helvetica")
      .fontSize(7)
      .text(
        "--------------------------------------------",
        {
          align: "center"
        }
      );
  };

  if (fs.existsSync(logoPath())) {
    try {
      doc.image(logoPath(), {
        fit: [paperWidth - 28, 70],
        align: "center"
      });

      doc.moveDown(0.2);
    } catch {
      // Logo failure must never stop bill generation.
    }
  }

  center(
    branch?.receiptHeader ||
      branch?.name ||
      "SRI GANAPATHY ANDHRA'S RUCHULU",
    11,
    true
  );

  if (branch?.address) {
    center(branch.address, 7);
  }

  if (branch?.phone) {
    center(`Ph: ${branch.phone}`, 7);
  }

  if (branch?.gstin) {
    center(
      `GSTIN: ${branch.gstin}`,
      7,
      true
    );
  }

  doc.moveDown(0.3);

  center(
    branch?.invoiceTitle ||
      "TAX INVOICE",
    9,
    true
  );

  separator();

  doc
    .font("Helvetica")
    .fontSize(7);

  doc.text(
    `Bill No: ${
      order.invoiceNumber || order.number
    }`
  );

  doc.text(
    `Date: ${new Date(
      order.createdAt
    ).toLocaleString("en-IN", {
      timeZone:
        branch?.timezone ||
        "Asia/Kolkata"
    })}`
  );

  doc.text(
    `Order: #${order.number} · ${order.source}`
  );

  if (order.bench) {
    doc.text(
      `Location: ${order.bench.label}`
    );
  }

  if (order.cashier?.name) {
    doc.text(
      `Cashier: ${order.cashier.name}`
    );
  }

  separator();

  for (const line of order.lines || []) {
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(
        line.menuItem?.name ||
          "Item"
      );

    if (line.menuItem?.hsnCode) {
      doc
        .font("Helvetica")
        .fontSize(6)
        .text(
          `HSN ${line.menuItem.hsnCode}`
        );
    }

    doc
      .font("Helvetica")
      .fontSize(7)
      .text(
        `${line.quantity} × ${rupees(
          line.unitPrice
        )}     ${rupees(
          line.lineTotal
        )}`
      );
  }

  separator();

  doc
    .font("Helvetica")
    .fontSize(8)
    .text(
      `Subtotal                         ${rupees(
        order.subtotal
      )}`
    );

  if (Number(order.discount) > 0) {
    doc.text(
      `Discount                        -${rupees(
        order.discount
      )}`
    );
  }

  if (Number(order.tax) > 0) {
    doc.text(
      `Tax                              ${rupees(
        order.tax
      )}`
    );
  }

  doc.moveDown(0.2);

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(
      `TOTAL                           ${rupees(
        order.total
      )}`
    );

  doc
    .font("Helvetica")
    .fontSize(7)
    .text(
      `Payment: ${
        order.paymentMethod ||
        "UNPAID"
      }`
    );

  if (
    branch?.paymentUpiEnabled &&
    branch?.upiId
  ) {
    try {
      const upiUri =
        `upi://pay?pa=${encodeURIComponent(
          branch.upiId
        )}` +
        `&pn=${encodeURIComponent(
          branch.upiName ||
            branch.name
        )}` +
        `&am=${Number(
          order.total
        ).toFixed(2)}` +
        `&cu=INR`;

      const qr =
        await QRCode.toBuffer(
          upiUri,
          {
            width: 160,
            margin: 1,
            errorCorrectionLevel: "M"
          }
        );

      doc.moveDown(0.5);

      doc.image(qr, {
        fit: [75, 75],
        align: "center"
      });

      center(
        branch.upiId,
        6
      );
    } catch {
      // UPI QR failure must never stop bill generation.
    }
  }

  separator();

  center(
    branch?.receiptFooter ||
      "Thank you. Please visit again.",
    7
  );

  doc.end();
}


