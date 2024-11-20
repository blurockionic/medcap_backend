import admin from 'firebase-admin'; // Use ES module import
import { storageBucket } from './config.js'; // Adjust this path if needed
import { firebaseConfig } from './config.js'; // Import firebaseConfig from config.js

// Initialize Firebase using the configuration from config.js
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig), // Use the configuration directly
  storageBucket: storageBucket, // Get the storage bucket from config
});

const bucket = admin.storage().bucket(); // Get a reference to the storage bucket

// Use ES module export
export { admin, bucket };
