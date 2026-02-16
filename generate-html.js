import admin from "firebase-admin";
import fs from "fs";

// 🔐 Service Account (GitHub secret tai local file)
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function buildHtml() {
  const snapshot = await db
    .collection("kirja")
    .orderBy("part")
    .orderBy("id")
    .get();

  const chapters = snapshot.docs.map(doc => doc.data());

  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        font-family: Georgia, serif;
        font-size: 11pt;
        line-height: 1.5;
      }
      .chapter {
        page-break-after: always;
      }
      h1 {
        page-break-after: avoid;
      }
      @page {
        size: A5;
        margin: 22mm 18mm 25mm 22mm;
      }
      @page :left {
        margin-left: 25mm;
        margin-right: 18mm;
      }
      @page :right {
        margin-left: 18mm;
        margin-right: 25mm;
      }
    </style>
  </head>
  <body>
  `;

  chapters.forEach(ch => {
    html += `
      <div class="chapter">
        <h1>${ch.title}</h1>
        ${ch.content
          .split(/\n\n+/)
          .map(p => `<p>${p}</p>`)
          .join("")}
      </div>
    `;
  });

  html += `</body></html>`;

  fs.writeFileSync("book_static.html", html);
  console.log("HTML built successfully.");
}

buildHtml();
