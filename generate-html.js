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
<html lang="fi">
<head>
<meta charset="UTF-8">
<title>Järjestelmä – Ihmiset – Muutos</title>

<style>
body {
  font-family: Georgia, serif;
  line-height: 1.5;
}

.chapter {
  page-break-after: always;
}

h1 {
  page-break-after: avoid;
}

p {
  text-align: justify;
  orphans: 3;
  widows: 3;
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
    html += `<div class="chapter">`;
    html += `<h1>${ch.title || ""}</h1>`;

    const paragraphs = ch.content
      ? ch.content.split(/\n\n+/)
      : [];

    paragraphs.forEach(p => {
      html += `<p>${p}</p>`;
    });

    html += `</div>`;
  });

  html += `
</body>
</html>
`;

  fs.writeFileSync("book_static.html", html);

  console.log("HTML created successfully.");

} catch (err) {
  console.error("HTML BUILD FAILED:");
  console.error(err);
  process.exit(1);
}
