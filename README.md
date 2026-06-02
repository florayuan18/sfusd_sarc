# SARC Comparison Tool

A single self-contained HTML file for exploring and comparing San Francisco
Unified School District (SFUSD) schools using 2023–24 School Accountability
Report Card (SARC) data. All data is embedded directly in the file, so it runs
in any modern browser with no build step, server, or backend.

## Features

The tool is organized into two tabs.

**Compare Schools.** Pick two schools (School A and School B) and click
**Compare** to see a side-by-side breakdown across sections including mission
statement, demographics, ELA / Math / Science test results, facility condition
ratings, staffing, class size, per-pupil expenditures, chronic absence and
suspension rates, and AP course offerings. District and state averages are
shown as reference, and rows where both schools have no data are hidden
automatically. Each school can also be opened as a full single-school profile.

**Find a School Near Me.** Search by school name, enter a home address, or use
your current location to drop a marker on a Google Map showing all 127 SFUSD
schools. A radius slider then filters nearby schools by commute time, using
real Muni / BART transit travel time from Google for the current departure
time rather than straight-line distance. Map pins are clickable and link back
into the comparison view, and a "Schools Nearby" panel lists results sorted by
distance.

## Running it

Open `sfusd_sarc_with_map.html` in a web browser. The **Compare Schools** tab
works immediately with no setup.

The **Find a School Near Me** tab needs a Google Maps browser key:

1. Open `sfusd_sarc_with_map.html` in a text editor.
2. Find `GOOGLE_MAPS_API_KEY` near the bottom of the `<script>` block and
   replace the placeholder with your own key.
3. Save and reopen the file in your browser.

Get a key at console.cloud.google.com and enable the **Maps JavaScript API**,
**Geocoding API**, and **Distance Matrix API**.

## Data

School data comes from SFUSD's 2023–24 School Accountability Report Cards
(SARC) and is embedded directly in the HTML file.

> For testing purposes only. For complete and authoritative information,
> consult the full SARC documents.
