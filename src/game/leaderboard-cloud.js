// Public read-only access to the Abyssal Rift Honour Board.
// Hero saves and account progression are local to this browser; this module never signs in or writes data.
const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
const CONFIG = {
  apiKey: 'AIzaSyAGqRSMtHdwt73HVyrcL0b_47pjoRz_fUg',
  projectId: 'velscour',
  appId: '1:368591862441:web:77117f1ec81c33192387b8',
};

let firestorePromise;
let readerOverride = null;
async function firestore() {
  if (!firestorePromise) {
    firestorePromise = Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-firestore-lite.js'),
    ]).then(([app, fs]) => {
      const firebaseApp = app.initializeApp(CONFIG, 'velscour-public-honour-board');
      return { fs, db: fs.getFirestore(firebaseApp) };
    }).catch((error) => { firestorePromise = null; throw error; });
  }
  return firestorePromise;
}

/** Read publicly listed runs for a class. This is the only remaining online game data access. */
export async function readHonourBoard(classId) {
  if (readerOverride) return readerOverride(classId);
  const { fs, db } = await firestore();
  const snapshot = await fs.getDocs(fs.collection(db, 'boards', classId, 'entries'));
  const entries = [];
  snapshot.forEach((doc) => entries.push({ uid: doc.id, ...doc.data() }));
  return entries;
}

/** Replace the public reader for isolated tests without initializing Firebase. */
export function useHonourBoardReader(reader) { readerOverride = reader; }
