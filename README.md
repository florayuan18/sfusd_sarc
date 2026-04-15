# SARC Navigator

Next.js 14 + TypeScript + Tailwind prototype for exploring SFUSD schools by
home address and commute context.

## Run Locally

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add a Google Maps browser key to `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GOOGLE_MAPS_SERVER_API_KEY=your_server_google_maps_api_key_here
```

The public key needs access to the Google Maps JavaScript API. The server key
needs access to the Geocoding API and Routes API.

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```
