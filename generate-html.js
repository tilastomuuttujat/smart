import admin from "firebase-admin";
import fs from "fs";

try {

  const serviceAccount = JSON.parse(
    fs.readFileSync("./serviceAccountKey.json", "utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();

  const snapshot = await db
    .collection("kirja")
    .orderBy("part")
    .orderBy("id")
    .get();

  if (snapshot.empty) {
    throw new Error("Firestore returned no documents.");
  }

  const chapters = snapshot.docs.map(doc => doc.data());

  let html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
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

  if (!fs.existsSync("book_static.html")) {
    throw new Error("HTML file not created.");
  }

  console.log("HTML created successfully.");

} catch (err) {
  console.error("HTML BUILD FAILED:");
  console.error(err);
  process.exit(1);
}
