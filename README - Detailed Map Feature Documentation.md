# SFUSD School Finder - Map Feature
# Detailed Documentation for An Active User Interested In Fully Maintaining, Migrating, Or Extending The Project
# Includes instructions for running local versions + explanation of files, utilities, and API use

## Project Overview

This interactive map tool helps families find San Francisco Unified School District (SFUSD) schools based on their home location and commute preferences. Users can search for schools by name, enter their home address, and view nearby schools sorted by actual commute times via car, public transit, biking, and walking.

### Key Features

- **Address-based search**: Enter your home address to see nearby schools
- **Multi-modal commute times**: View travel times by car, public transit (Muni/BART), bike, and walking
- **School filtering**: Filter by school type (elementary, middle, high school) and commute duration (15/30/45 minutes)
- **Direct school search**: Search for specific schools by name to check commute times
- **Interactive map**: Visual display of all schools with custom markers and radius visualization

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Google Maps API key with the following APIs enabled:
  - Maps JavaScript API
  - Geocoding API
  - Distance Matrix API

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Google Maps API key:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── commute/route.ts      # Commute time calculation endpoint
│   │   └── geocode/route.ts      # Address geocoding endpoint
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Main page component
│
├── components/                   # React components
│   ├── map/                      # Map-specific components
│   │   ├── MapOverlay.tsx        # Map UI overlay elements
│   │   ├── MapStatusBadge.tsx    # Status indicator for map operations
│   │   └── RadiusControl.tsx     # Commute radius slider control
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx            # Button component
│   │   └── Card.tsx              # Card container component
│   ├── AddressSearch.tsx         # Home address search input
│   ├── CommuteMetrics.tsx        # Display commute times for a school
│   ├── EmptyState.tsx            # Placeholder when no results
│   ├── NearbySchoolsList.tsx     # List of schools sorted by commute
│   ├── PageHeader.tsx            # Page title and description
│   ├── SchoolMap.tsx             # Main map component
│   ├── SchoolProfileCard.tsx     # Individual school info card
│   ├── SchoolSearch.tsx          # Direct school name search
│   ├── SchoolTypeFilter.tsx      # Elementary/Middle/High filter
│   └── SearchResults.tsx         # Results container
│
├── data/                         # Static data files
│   ├── sfusd_schools.json        # School database (126 schools)
│   └── sfusd_schools.ts          # TypeScript school data export
│
├── hooks/                        # Custom React hooks
│   ├── map/                      # Map-related hooks
│   │   ├── useGoogleMap.ts       # Initialize Google Maps instance
│   │   ├── useHomeGeocoding.ts   # Geocode user's home address
│   │   ├── useHomeMarker.ts      # Manage home location marker
│   │   ├── useSchoolGeocoding.ts # Geocode school addresses
│   │   └── useSchoolMarkers.ts   # Manage school markers on map
│   ├── useCommuteResults.ts      # Fetch and manage commute times
│   └── useSarcNavigator.ts       # Navigate to SARC comparison tool
│
├── lib/                          # Utility functions
│   ├── classNames.ts             # CSS class name utilities
│   ├── commute.ts                # Commute calculation logic
│   ├── geocode.ts                # Geocoding utilities
│   ├── googleMaps.ts             # Google Maps API helpers
│   ├── mapConfig.ts              # Map configuration constants
│   ├── mapMarkers.ts             # Marker creation and styling
│   └── schoolUtils.ts            # School data filtering/sorting
│
├── scripts/                      # Build/utility scripts
│   └── geocode-sfusd-schools.mjs # Pre-geocode school addresses
│
├── types/                        # TypeScript type definitions
│   ├── map.ts                    # Map-related types
│   └── school.ts                 # School data types
│
├── .env.example                  # Example environment variables
├── next.config.mjs               # Next.js configuration
├── package.json                  # Project dependencies
├── tailwind.config.ts            # Tailwind CSS configuration
└── tsconfig.json                 # TypeScript configuration
```

---

## Code Explanation

### Core Components

#### **`SchoolMap.tsx`** (Main Map Component)
Orchestrates all map functionality:
- Initializes Google Maps instance
- Manages user's home location marker
- Displays school markers with custom icons
- Handles marker clicks to show school info windows
- Draws radius circle around home location
- Coordinates with sidebar components for filtering

#### **`AddressSearch.tsx`** (Address Input)
- Text input for user's home address
- Uses Google Geocoding API to convert address to coordinates
- "Use Current Location" button for geolocation
- Validates San Francisco addresses

#### **`NearbySchoolsList.tsx`** (Results List)
- Displays schools sorted by commute time
- Groups by school type (Elementary/Middle/High)
- Shows all four commute modes (drive/transit/bike/walk)
- Click to center map on selected school
- Updates in real-time as filters change

#### **`SchoolTypeFilter.tsx`** & **`RadiusControl.tsx`** (Filters)
- Toggle between Elementary/Middle/High schools or "All"
- Slider to adjust max commute time (15/30/45 minutes)
- Immediately filters visible schools on map and list

#### **`SchoolSearch.tsx`** (Direct School Lookup)
- Autocomplete dropdown of all 126 schools
- Bypasses address requirement for quick lookups
- Centers map and shows commute info for selected school

### Data Flow

1. **User enters address** → `AddressSearch` → `useHomeGeocoding` hook
2. **Geocoding** → API route `/api/geocode` → Google Geocoding API
3. **Home marker placed** → `useHomeMarker` updates map
4. **Commute calculation** → `useCommuteResults` → `/api/commute` → Google Distance Matrix API
5. **Results filtered** → `schoolUtils.ts` applies school type and commute time filters
6. **UI updates** → `NearbySchoolsList` and map markers reflect filtered results

### API Routes

#### **`/api/geocode/route.ts`**
- **Input**: `{ address: string }`
- **Output**: `{ lat: number, lng: number }` or error
- Calls Google Geocoding API server-side to keep API key secure

#### **`/api/commute/route.ts`**
- **Input**: `{ origin: LatLng, destinations: LatLng[], modes: TravelMode[] }`
- **Output**: Array of commute times for each destination × mode
- Uses Google Distance Matrix API (max 25 destinations per request)
- Handles batching for large school lists

### Key Utilities

#### **`lib/schoolUtils.ts`**
```typescript
filterSchoolsByType(schools, type) // "elementary" | "middle" | "high" | "all"
filterSchoolsByCommute(schools, maxMinutes, mode) // Filter by commute threshold
sortSchoolsByCommute(schools, mode) // Sort by drive/transit/bike/walk time
```

#### **`lib/mapMarkers.ts`**
```typescript
createSchoolMarker(school, map) // Custom SVG marker with school type icon
createHomeMarker(position, map) // Blue home location marker
createRadiusCircle(center, radiusMeters, map) // Visual commute radius
```

#### **`lib/commute.ts`**
```typescript
calculateCommuteTimes(origin, schools) // Fetch all commute times
estimateCommuteRadius(minutes, mode) // Convert time to approx. distance
```

### Hooks Architecture

#### **Map Initialization** (`useGoogleMap`)
- Loads Google Maps script
- Creates map instance with SFUSD-centered view
- Returns map ref for other hooks to use

#### **Geocoding** (`useHomeGeocoding` & `useSchoolGeocoding`)
- Debounced API calls to prevent rate limiting
- Caches results in component state
- Error handling for invalid addresses

#### **Marker Management** (`useHomeMarker` & `useSchoolMarkers`)
- Creates/updates markers when data changes
- Attaches click listeners to show info windows
- Cleans up markers on unmount

#### **Commute Data** (`useCommuteResults`)
- Fetches commute times when home location changes
- Stores results keyed by school ID
- Provides loading/error states

---

## School Data

### **`sfusd_schools.json`**
Contains 126 SFUSD schools with:
- `id`: Unique identifier
- `name`: Full school name
- `gradeLevels`: e.g., "Elementary (K-5)", "Middle School (6-8)"
- `address`: Full street address
- `lat`, `lng`: Pre-geocoded coordinates (generated via `scripts/geocode-sfusd-schools.mjs`)

**Example entry:**
```json
{
  "id": 1,
  "name": "A.P. Giannini Middle School",
  "gradeLevels": "Middle School (6-8)",
  "address": "3151 Ortega Street, San Francisco, CA 94122",
  "lat": 37.7503953,
  "lng": -122.4974028
}
```

### Pre-geocoding Script
```bash
node scripts/geocode-sfusd-schools.mjs
```
- Reads schools from JSON
- Calls Geocoding API for each address
- Updates `lat`/`lng` fields
- Run this if school addresses change

---

## Integration with SARC Comparison Tool

The project includes `sfusd_sarc_with_map.html`, a standalone HTML file with school comparison features. The map feature complements this by:

1. **Linking from map to SARC**: Each school's info window has a "Compare" button that navigates to the SARC tool with that school pre-selected
2. **Shared school data**: Both use the same `sfusd_schools.json` database
3. **Consistent styling**: UI design matches SFUSD branding (blues, card layouts)

---

## Extending the Project

### Adding New Schools
1. Add entry to `data/sfusd_schools.json`
2. Run `node scripts/geocode-sfusd-schools.mjs` to populate coordinates
3. School will automatically appear in map and search

### Adding New Commute Modes
1. Update `types/map.ts` with new `TravelMode` value
2. Add mode to `lib/commute.ts` Distance Matrix API call
3. Update `CommuteMetrics.tsx` to display new mode
4. Add filter option in `RadiusControl.tsx`

### Customizing Map Appearance
- Edit `lib/mapConfig.ts` for default center/zoom
- Modify `lib/mapMarkers.ts` to change marker icons/colors
- Update `MapOverlay.tsx` for UI element positioning

### Performance Optimization
- **Commute caching**: Results currently fetch on every address change. Consider localStorage caching.
- **Marker clustering**: For zoomed-out views, use `@googlemaps/markerclusterer` to group nearby schools.
- **Lazy loading**: Split map code into separate bundle with Next.js dynamic imports.

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here  # Required
NEXT_PUBLIC_MAP_DEFAULT_CENTER_LAT=37.7749     # Optional, defaults to SF
NEXT_PUBLIC_MAP_DEFAULT_CENTER_LNG=-122.4194   # Optional
```

---

## Troubleshooting

### "Google Maps API key required" warning
- Ensure `.env.local` exists with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Verify API key has Maps JavaScript, Geocoding, and Distance Matrix APIs enabled
- Check browser console for specific API errors

### Schools not showing commute times
- Check browser network tab for `/api/commute` errors
- Verify Distance Matrix API is enabled and has quota
- Ensure origin address is valid (within San Francisco)

### Map not loading
- Confirm `useGoogleMap` hook successfully loads script
- Check for JavaScript errors in console
- Verify `NEXT_PUBLIC_` prefix on env variable (required for browser access)

### Incorrect commute times
- Distance Matrix API uses current traffic conditions
- Times vary by departure time (rush hour vs off-peak)
- Transit times depend on Muni/BART schedules

---

## Development Notes

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + CSS Modules
- **State Management**: React hooks (no Redux/Zustand needed for this scope)
- **Map Library**: Google Maps JavaScript API (native, not react-google-maps wrapper)
- **TypeScript**: Strict mode enabled for type safety


---

## Support

For questions about extending this project:
- Check `types/` folder for TypeScript interfaces
- Review `lib/` utilities for reusable functions
- See `hooks/` for state management patterns

**API Quota Management**:
- Geocoding: ~1 call per address search
- Distance Matrix: ~1 call per 25 schools (batched)
- Maps JavaScript: Billed per map load

Consider implementing request caching or user authentication to control costs in production.



