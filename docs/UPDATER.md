# Velscour PC updater

The title-screen updater reads only [`/version.json`](../version.json) from this fork's GitHub Pages site. It does not query the GitHub API. Update packages are direct ZIP assets attached to releases in `ZethenZynx/Velscour-PC`.

## Publishing a version

1. Commit the release-ready game to `main`.
2. Create and push a semantic version tag such as `v1.2.3` pointing at that commit.
3. The `Publish Velscour PC release` workflow packages that tagged source, stamps its version and source commit, and publishes the ZIP with a SHA-256 sidecar.
4. The workflow advances the root `version.json` only when the tag is newer, pushes that manifest to `main`, then requests a GitHub Pages rebuild. The updater starts advertising the version after Pages serves the new manifest.

Do not edit the generated release fields in `version.json` by hand. The checked-in development manifest deliberately has no download URL, so it cannot advertise an unverified package. The package checksum and byte size are required before an update can be offered.

## Applying an update

The browser game cannot safely overwrite its own installation files. The updater opens the fork's direct ZIP download, then lets the player select the downloaded file for a streaming, local size and SHA-256 verification. The game files are not replaced by the updater; extract the package only after verification succeeds. Saves and settings remain in browser storage and are not part of the release ZIP.
