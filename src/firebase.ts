/**
 * Инициализация Firebase.
 *
 * Конфиг проекта «Кушай вкусно». Используется:
 *   - Firebase Authentication — вход «ник + пароль»
 *   - Cloud Firestore         — коллекция `users`, документ = uid, поле `data`
 *
 * Права Firestore уже настроены правилами (владелец документа = uid).
 */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB0DjBVTOCK7j4z0R8dvjVHtcUHrFl-jRQ",
  authDomain: "kushay-vkusno.firebaseapp.com",
  projectId: "kushay-vkusno",
  storageBucket: "kushay-vkusno.firebasestorage.app",
  messagingSenderId: "749263431792",
  appId: "1:749263431792:web:56710e175250c22df22cb5",
};

const app = initializeApp(firebaseConfig);

/** Firebase Authentication (ник+пароль поверх email). */
export const auth = getAuth(app);

/** Cloud Firestore. */
export const db = getFirestore(app);
