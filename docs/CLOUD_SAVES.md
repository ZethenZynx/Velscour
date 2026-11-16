# Google account cloud saves (retired)

Google sign-in and cloud copies of heroes and Endgame progression have been removed from the game. Characters,
settings, and progression continue to save in the current browser. The game no longer signs in, uploads, downloads,
merges, or deletes Google account save data.

The removal does not erase copies that may already exist in the Firebase project. Those remote records are untouched.
The Abyssal Rift Honour Board remains available as a read-only list of entries that were posted before board posting
was disabled. New runs and local bests remain on this browser and are not sent online.

`src/game/leaderboard-cloud.js` contains the narrow public-read path for that board. It loads Firebase App and
Firestore Lite only when the Honour Board is opened; it does not load Firebase Auth. `src/game/herobackup.js` remains
for local save recovery and is independent of the retired cloud-save feature.
