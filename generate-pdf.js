import puppeteer from "puppeteer";
import path from "path";

const filePath = path.resolve("./ekirja.html");

(async () => {
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
      waitUntil: "networkidle0"
    });

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
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "0mm",
        right: "0mm"
      }
    });

    await browser.close();
    console.log("PDF created successfully.");
  } catch (error) {
    console.error("PDF generation failed:");
    console.error(error);
    process.exit(1);
  }
})();
