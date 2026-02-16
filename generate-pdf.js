import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

async function generatePDF() {
  const filePath = path.resolve("book_static.html");

  if (!fs.existsSync(filePath)) {
    throw new Error("book_static.html not found before PDF generation.");
  }

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.goto("file://" + filePath, {
    waitUntil: "networkidle0"
  });

  await page.pdf({
    path: "Kirja_A5_PRINT.pdf",
    format: "A5",
    printBackground: true,
    preferCSSPageSize: true
  });

  await browser.close();

  console.log("PDF generated successfully.");
}

generatePDF();
