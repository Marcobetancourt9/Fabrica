import admin from 'firebase-admin';
import fs from 'fs';

// Inicializar el SDK de Admin usando la variable de entorno
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountKey) {
  console.error("Error: FIREBASE_SERVICE_ACCOUNT variable de entorno no encontrada.");
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

async function backup() {
  console.log("Iniciando respaldo de Firestore...");
  try {
    const collections = await db.listCollections();
    const backupData = {};

    for (const collection of collections) {
      console.log(`Exportando colección: ${collection.id}...`);
      backupData[collection.id] = {};
      const snapshot = await collection.get();
      
      snapshot.forEach(doc => {
        backupData[collection.id][doc.id] = doc.data();
      });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `backup-${dateStr}.json`;
    
    fs.writeFileSync(fileName, JSON.stringify(backupData, null, 2));
    console.log(`Respaldo creado exitosamente: ${fileName}`);
  } catch (error) {
    console.error("Error durante el respaldo:", error);
    process.exit(1);
  }
}

backup();
