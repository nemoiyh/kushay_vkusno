/**
 * Инициализация Firebase.
 *
 * Конфиг проекта «Кушай вкусно». Используется:
 *   - Firebase Authentication — вход «ник + пароль»
 *   - Cloud Firestore         — коллекция `users`, документ = uid, поле `data`
 *
 * Инициализация выполнена ЛЕНИВО и обёрнута в try/catch: даже если Firebase
 * не сможет стартовать (sandboxed-iframe, недоступен indexedDB и т.п.), модуль
 * НЕ бросит исключение при импорте и приложение не упадёт в белый экран —
 * аксессоры вернут null, а вызывающий код покажет понятную ошибку.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB0DjBVTOCK7j4z0R8dvjVHtcUHrFL-jRQ",
  authDomain: "kushay-vkusno.firebaseapp.com",
  projectId: "kushay-vkusno",
  storageBucket: "kushay-vkusno.firebasestorage.app",
  messagingSenderId: "749263431792",
  appId: "1:749263431792:web:56710e175250c22df22cb5",
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
/** Становится true, если инициализация однажды упала — не дёргаем Firebase снова. */
let failed = false;

function ensureApp(): FirebaseApp | null {
  if (app) return app;
  if (failed) return null;
  try {
    app = initializeApp(firebaseConfig);
    return app;
  } catch {
    failed = true;
    return null;
  }
}

/** Firebase Authentication. Вернёт null, если Firebase недоступен в этой среде. */
export function getAuthSafe(): Auth | null {
  if (authInstance) return authInstance;
  if (failed) return null;
  const a = ensureApp();
  if (!a) return null;
  try {
    authInstance = getAuth(a);
    return authInstance;
  } catch {
    failed = true;
    return null;
  }
}

/** Cloud Firestore. Вернёт null, если Firebase недоступен в этой среде. */
export function getDbSafe(): Firestore | null {
  if (dbInstance) return dbInstance;
  if (failed) return null;
  const a = ensureApp();
  if (!a) return null;
  try {
    dbInstance = getFirestore(a);
    return dbInstance;
  } catch {
    failed = true;
    return null;
  }
}
