# Huella Viva 360 — Mobile

Field app for [Huella Viva 360](../README.md). Territorial teams and community leaders use it to record what happened, read it back as a logbook, see it on a map, and check whether commitments are being kept.

All business data comes from the [backend](../backend). This app decides how that data is scoped and presented for the signed-in role. It does not invent activities on its own.

## Who the screens are for

After login the app reads `role` and `communityId` from the session.

| Role | Home title | Logbook title | Scope |
| --- | --- | --- | --- |
| `COMUNIDAD` | The community’s name, or “Mi comunidad” | “Mi bitácora” | Activities of their community **or** activities they authored. |
| `ADMIN_TERRITORIAL`, `EMPRESA`, `ESTADO` | “Impacto Territorial” | “Memoria” | The whole territory. These three roles can change activity status and mark a commitment fulfilled. |

`EMPRESA` and `ESTADO` are operational peers of the territorial manager inside the app: same map, same logbook, same permission to close follow-up. `COMUNIDAD` can capture and read, and cannot close a hito.

Signing out clears the session. There is no in-app registration screen; accounts are created by the API (the local seed is documented in the backend README).

## Terra Voz

Opened from the home screen or from the red microphone on the map.

The user either types a sentence or records audio. The app attaches the current GPS coordinates and asks the API for a **preview**. Nothing is stored yet.

The preview is editable:

- Place, shown as text. It is whatever the backend extracted (spoken name, GPS place, coordinates, or transcript). There is no fixed list of communities.
- Description.
- Activity type: meeting, visit, inspection, workshop, other.
- Status: scheduled or executed.

If the API says the message is incomplete, the issues are shown and confirm stays blocked. Typical causes: too few words, no real description, no activity type, no place, or a test phrase.

Confirm sends the edited preview to `POST /activities/terra-voz/confirm`. On success the app shows the backend’s confirmation sentence (type, status, community, and how many commitments were created) and refreshes the dashboard, the logbook, and the map.

Demo sentences shipped in the capture screen, for field trials:

- “Hoy visité Medellín para revisar el acueducto”
- “Reunión mañana en Buenos Aires con la comunidad”
- “Compromiso: entregar tubería el viernes en San José del Guaviare”

## Memoria Viva

Reverse-chronological list of activities. Each row is a territorial record: type, status, date, description, community.

Filters (one at a time): all, executed, scheduled, meetings, visits, inspections, workshops.

The summary count uses the same scope as the list before those filters, so a community leader’s “N actividades de tu comunidad” matches the home-screen activity total.

Opening a record (“Seguimiento”) shows date, description, community name, GPS when it was captured, photo and audio when the activity has them, and every commitment with its responsible party, status, and due date.

Authorized roles can:

- Flip the activity between `PROGRAMADA` and `EJECUTADA`.
- Mark a commitment that is not yet `CUMPLIDO` as fulfilled. That is the hito the dashboard counts.

Community leadership sees the same detail and cannot press those actions.

## Mapa Vivo Territorial

Satellite map, camera tilted about 45 degrees, centered on the device GPS once location permission is granted, with the standard user-location dot.

Pins:

- One per community that has coordinates.
- One per activity. The activity pin uses the GPS stored with the report. If that GPS is missing, the pin is offset slightly from the community so several reports in the same place remain distinguishable.

Tapping an activity pin opens its Memoria Viva detail. After Terra Voz confirms a new report, the map remounts so the new pin is part of the current picture.

The tab bar stays visible on the map. The microphone floats above it.

## Impact dashboard

Home answers whether the territory (or, for community leadership, *their* territory) is keeping its word.

- **Confidence index** — percentage returned by `GET /dashboard/metrics`: fulfilled commitments divided by all commitments in scope.
- **Activities** — total, with executed and scheduled underneath. Tapping the card opens the logbook.
- **Communities** — catalog size for territorial roles, plus how many have at least one activity. A community user always sees `1`.
- **Hitos** — fulfilled commitments.
- **Gestión por tipo** — bar per activity type. The numerator is the sum of those bars and is meant to equal the activity total.

Community metrics are requested with both `communityId` and `userId`, matching the logbook query, so the two screens do not disagree.

## Session and API

`EXPO_PUBLIC_API_URL` is the backend base URL. The login call stores the JWT; later requests send it.

The app does not recalculate the confidence index or re-parse voice. It displays what the API decided and sends back only the edits the user confirmed.

## Run locally

```bash
npm install
# EXPO_PUBLIC_API_URL=http://<host>:4000
# GOOGLE_MAPS_API_KEY=...   required for a release Android map; without it the native map view crashes
npx expo start
```

The map key is read in `app.config.js` (`GOOGLE_MAPS_API_KEY`, or the `_ANDROID` / `_IOS` variants) and injected into the native config. Expo Go can show the map without that release key; a locally assembled APK cannot.
