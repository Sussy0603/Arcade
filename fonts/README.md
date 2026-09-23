# Fonts

Two typefaces, both under the SIL Open Font License 1.1, which permits
redistribution — so they are served from this folder rather than from
Google's CDN.

That is deliberate. This whole build exists to get the Arcade off an
origin it shared with the MOS API and session cookie; adding a
third-party font request would hand every visitor's IP and referrer to
another company for no benefit. It also keeps the promise in the main
README true: upload the folder and it works, offline and airgapped
included.

    permanent-marker-latin.woff2   Permanent Marker, by Font Diner
    dm-sans-latin.woff2            DM Sans (variable 400-700), by Colophon
    dm-sans-latin-ext.woff2        DM Sans, extended Latin

Permanent Marker is the display face — headings and the hand-lettered
labels. DM Sans does everything that has to be read rather than looked
at. Full licence: https://openfontlicense.org
