import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const filePath = path.resolve("./ekirja.html");

(async () => {
  if (!fs.existsSync(filePath)) {
    console.error("HTML FILE NOT FOUND");
    process.exit(1);
  }

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });

    const page = await browser.newPage();

    await page.goto(`file://${filePath}`, {
      waitUntil: "load",
      timeout: 0
    });

    // Anna selaimelle hetki renderöidä
    await page.waitForTimeout(2000);

    await page.emulateMediaType("print");

    await page.pdf({
      path: "Kirja_A5_PRINT.pdf",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="font-size:9px;width:100%;text-align:center;">
          <span class="pageNumber"></span>
        </div>`,
    });

    await browser.close();
    console.log("PDF created successfully");

  } catch (error) {
    console.error("PDF generation failed:");
    console.error(error);
    process.exit(1);
  }
})();
