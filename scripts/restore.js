import admin from 'firebase-admin';
import fs from 'fs';

// Inicializar el SDK de Admin usando la variable de entorno
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountKey) {
  console.error("Error: FIREBASE_SERVICE_ACCOUNT variable de entorno no encontrada.");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Error: Debes proporcionar la ruta al archivo JSON de respaldo.");
  console.error("Uso: npm run restore <ruta_al_archivo.json>");
  process.exit(1);
}

const filePath = args[0];

if (!fs.existsSync(filePath)) {
  console.error(`Error: El archivo ${filePath} no existe.`);
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountKey);
} catch (error) {
  console.error("Error parseando el JSON de FIREBASE_SERVICE_ACCOUNT:", error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function restore() {
  console.log(`Iniciando restauración desde: ${filePath}`);
  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const backupData = JSON.parse(rawData);

    for (const [collectionName, documents] of Object.entries(backupData)) {
      console.log(`Restaurando colección: ${collectionName}...`);
      
      const docEntries = Object.entries(documents);
      let count = 0;
      
      // Guardar cada documento
      for (const [docId, docData] of docEntries) {
        await db.collection(collectionName).doc(docId).set(docData);
        count++;
      }
      
      console.log(`Colección ${collectionName} restaurada con éxito. (${count} documentos)`);
    }

    console.log("¡Restauración completada exitosamente!");
  } catch (error) {
    console.error("Error durante la restauración:", error);
    process.exit(1);
  }
}

restore();
