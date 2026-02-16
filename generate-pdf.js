import puppeteer from "puppeteer";
import fs from "fs";

async function generatePDF() {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.goto(`file://${process.cwd()}/book_static.html`, {
    waitUntil: "networkidle0"
  });

  await page.pdf({
    path: "Kirja_A5_PRINT.pdf",
    format: "A5",
    printBackground: true,
    preferCSSPageSize: true
  });

  await browser.close();
  console.log("PDF generated.");
}

generatePDF();
