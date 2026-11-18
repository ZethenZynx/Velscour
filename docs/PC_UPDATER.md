# Velscour PC fork updater

The title screen checks only the latest published release in `ZethenZynx/Velscour-PC` (the canonical name of the user's Velscour fork). It does not contact the Velscour Online server or any upstream game repository. The check runs in the background; network failures leave the game playable and do not affect saves.

The PC edition is static HTML and JavaScript served by a browser. Browser JavaScript cannot safely replace its own files or inspect arbitrary local files. For that reason, this updater never installs an archive, edits the game folder, clears browser storage, or reports an installation as complete. It offers a checksummed release ZIP for a side-by-side install. Player saves and settings remain in browser `localStorage`.

## Publishing a release

Push a semantic version tag such as `v0.2.0` to the fork. The `Publish Velscour PC release` workflow packages the tagged repository contents, stamps the package with the tag version, calculates a SHA-256 checksum, and publishes both files as a GitHub Release. The title screen detects a newer release and displays its notes, ZIP size, and SHA-256. It only enables a ZIP download when GitHub reports the archive's SHA-256 digest.

The current source checkout reports `0.0.0-dev`; tagged release packages contain the exact version from their tag. The first release can use `v0.1.0`. Until a release is published, automatic checks keep the update button hidden. The title menu's **Check for Updates** item reports the current state or any network error.

## Safe installation

Download the ZIP and checksum, verify the ZIP with `Get-FileHash <archive> -Algorithm SHA256` in PowerShell, and compare it with the digest shown in the update window. Extract to a new folder and launch that copy using the same local HTTP server instructions in the README. Do not extract over a customized folder. No updater code applies files automatically.
