# Parallax --- AI-Powered Satellite Disaster Intelligence

Parallax is a satellite-imagery analysis platform designed to detect and
visualize environmental and disaster-related changes between two dates.

The application combines a web-based dashboard, an interactive map,
satellite imagery from public Earth-observation services, and
change-detection logic. It supports flood, wildfire, vegetation-change,
and automatic detection modes.

> **Current model status:** The project contains an integration adapter
> for the team's trained LEVIR-CD256 model. If the trained model is not
> connected yet, the backend falls back to disaster-specific spectral
> analysis using Sentinel-2 imagery.

## Features

-   Interactive Leaflet map for selecting an analysis location
-   Manual latitude/longitude input
-   Before/after date selection
-   Automatic disaster classification
-   Flood-change detection
-   Wildfire/burn-change detection using dNBR
-   Vegetation-loss detection using NDVI
-   Before/after satellite-image comparison slider
-   AI change-mask visualization
-   Analysis dashboard with:
    -   affected area
    -   detected change area
    -   percentage change
    -   confidence score
    -   detection mode
    -   satellite acquisition dates
-   Text report export
-   FastAPI backend with Swagger API documentation
-   Optional integration point for a trained computer-vision model

## Architecture

``` text
                    ┌─────────────────────┐
                    │      Parallax UI    │
                    │ HTML + CSS + JS     │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │     FastAPI API     │
                    │     backend.py      │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
       ┌──────────────────┐       ┌──────────────────┐
       │ Microsoft         │       │ NASA GIBS        │
       │ Planetary        │       │ imagery service  │
       │ Computer / STAC  │       └──────────────────┘
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────────┐
       │ Sentinel-2 L2A data  │
       │ B02 B03 B04 B08      │
       │ B11 B12              │
       └──────────┬───────────┘
                  │
                  ▼
       ┌──────────────────────┐
       │ Change Detection     │
       │                      │
       │ Team AI model        │
       │        OR            │
       │ Spectral fallback    │
       └──────────┬───────────┘
                  │
                  ▼
       ┌──────────────────────┐
       │ Change mask + stats  │
       │ + before/after data  │
       └──────────┬───────────┘
                  │
                  ▼
             Dashboard
```

## Project Structure

``` text
satellite_project/
│
├── backend.py
├── model_inference.py
├── script.js
├── index.html
├── style.css
├── logo.svg
├── hero.jpg
└── README.md
```

### `backend.py`

FastAPI server responsible for:

-   validating analysis requests
-   querying Sentinel-2 scenes
-   retrieving satellite bands
-   generating RGB imagery
-   calculating disaster-specific change masks
-   calling the optional custom AI model
-   returning analysis results to the frontend

### `model_inference.py`

Adapter for the team's trained LEVIR-CD256 model.

The backend expects:

``` python
predict_change(before_rgb, after_rgb)
```

to return a 2-D change mask with the same height and width as the input
imagery.

### `script.js`

Frontend controller responsible for:

-   Leaflet map initialization
-   location selection
-   coordinate synchronization
-   API requests
-   result rendering
-   before/after comparison
-   AI change-map display
-   report export

### `index.html`

Main Parallax dashboard and user interface.

### `style.css`

Visual design and responsive layout.

## Requirements

Recommended environment:

-   Python 3.11 or 3.12
-   Modern web browser
-   Internet connection
-   Access to public satellite data services

Install the Python dependencies:

``` bash
pip install fastapi uvicorn numpy pillow requests rasterio pystac-client planetary-computer pydantic
```

If your environment does not already contain GDAL/rasterio dependencies,
install `rasterio` using a compatible Python wheel or environment
manager.

## Running the Backend

Open a terminal inside the project folder:

``` bash
python backend.py
```

A successful startup should display:

``` text
Parallax backend starting...

API:   http://127.0.0.1:8000
Docs:  http://127.0.0.1:8000/docs
Press CTRL+C to stop.
```

### API documentation

Open:

``` text
http://127.0.0.1:8000/docs
```

### Health check

Open:

``` text
http://127.0.0.1:8000/api/health
```

Expected response:

``` json
{
  "status": "healthy"
}
```

## Running the Frontend

The frontend communicates with:

``` text
http://127.0.0.1:8000
```

For the most reliable browser behavior, serve the project directory with
a local HTTP server instead of opening `index.html` directly.

From the project folder:

``` bash
python -m http.server 5500
```

Then open:

``` text
http://127.0.0.1:5500
```

Keep the FastAPI backend running in a separate terminal.

## Using Parallax

1.  Start the FastAPI backend.
2.  Start a local HTTP server for the frontend.
3.  Open the Parallax webpage.
4.  Select a disaster mode:
    -   Auto Detect
    -   Flood
    -   Wildfire
    -   Vegetation
5.  Click a location on the map or enter latitude and longitude.
6.  Select a Before date.
7.  Select an After date.
8.  Click **Analyze Disaster**.
9.  Wait for satellite scenes to be retrieved and processed.
10. Review the before/after imagery.
11. Use **Show AI Detected Changes** to inspect the generated change
    mask.
12. Review the dashboard statistics.
13. Export the analysis report if required.

## Detection Methods

### Flood

Flood analysis primarily uses water-related spectral change through
NDWI. NASA GIBS imagery can also be used as an additional imagery
source.

### Wildfire

Wildfire analysis uses normalized burn ratio:

``` text
NBR = (NIR - SWIR) / (NIR + SWIR)
```

and detects burn-related changes using:

``` text
dNBR = NBR_before - NBR_after
```

### Vegetation

Vegetation analysis uses NDVI:

``` text
NDVI = (NIR - Red) / (NIR + Red)
```

and detects vegetation loss using the difference between the before and
after NDVI values.

### Team AI Model

When the trained model is correctly connected through
`model_inference.py`, the model takes priority over the spectral
fallback.

This allows the same application architecture to support the team's
actual computer-vision model without changing the frontend.

## LEVIR-CD256 Integration

LEVIR-CD is a change-detection dataset containing pairs of
remote-sensing images with building-change annotations.

The current project does **not** include a trained model checkpoint.

To connect the team's model, implement:

``` python
def predict_change(before_rgb, after_rgb):
    # preprocess
    # model inference
    # postprocess
    return change_mask
```

The returned `change_mask` should be:

``` text
height × width
```

with values representing changed and unchanged pixels.

For example:

``` python
return mask > 0.5
```

The backend automatically converts the result into the visual change
overlay.

### Important limitation

A LEVIR-CD256 model is primarily a **building-change detector**, while
Parallax's disaster modes include flood, wildfire, and vegetation
change.

Therefore, the LEVIR model should be presented as the project's **AI
change-detection component**, while disaster-specific classification and
spectral analysis should be clearly distinguished from it.

## API

### `GET /`

Returns basic service information.

### `GET /api/health`

Checks whether the API is running.

### `POST /api/predict`

Runs satellite change analysis.

Example request:

``` json
{
  "lat": 13.0827,
  "lon": 80.2707,
  "before_date": "2025-01-01",
  "after_date": "2025-02-15",
  "zoom_km": 4,
  "selected_disaster": "auto"
}
```

Possible `selected_disaster` values:

``` text
auto
flood
wildfire
vegetation
```

The response includes:

``` json
{
  "status": "success",
  "category": "vegetation",
  "active_mode": "vegetation",
  "before_image": "...",
  "after_image": "...",
  "change_image": "...",
  "detection_source": "spectral_heuristic",
  "scores": {},
  "stats": {},
  "dates": {}
}
```

## Data Sources

Parallax uses public Earth-observation services, including:

-   Microsoft Planetary Computer STAC catalog
-   Sentinel-2 Level-2A imagery
-   NASA GIBS imagery
-   OpenStreetMap tiles for the interactive map

The availability and quality of analysis depend on satellite coverage,
cloud cover, selected dates, geographic location, and the requested
analysis area.

## Important Limitations

This is a prototype and should not be treated as an operational
disaster-response system.

-   Satellite scenes may not exist for the requested date.
-   Cloud cover can reduce image quality.
-   The nearest available satellite scene may differ from the requested
    date.
-   Spectral thresholds are heuristic and should not be interpreted as
    certified disaster measurements.
-   A confidence score generated by the prototype is an
    application-level estimate, not a calibrated probability.
-   A trained LEVIR-CD256 model is not included in this repository.
-   The current flood fallback is not a dedicated SAR flood-segmentation
    model.
-   Analysis area is approximated from the configured map radius.
-   Internet access is required to retrieve remote satellite and map
    data.

## Troubleshooting

### Backend appears to do nothing

Run:

``` bash
python backend.py
```

Make sure you see:

``` text
Parallax backend starting...
```

Then test:

``` text
http://127.0.0.1:8000/api/health
```

### `ModuleNotFoundError`

Install the missing dependency:

``` bash
pip install <package-name>
```

### Frontend says "Failed to fetch"

Check that the backend is running on:

``` text
http://127.0.0.1:8000
```

Also make sure the frontend is being served through a local HTTP server.

### No satellite scenes found

Try:

-   a different date
-   a wider date range
-   another nearby location
-   a smaller or larger analysis area

Cloudy or unavailable scenes can prevent successful analysis.

### Map does not appear

Check that the browser has internet access and that the Leaflet
resources used by the webpage are loading correctly.

## Hackathon Demonstration Flow

For a reliable demonstration:

``` text
1. Open Parallax
       ↓
2. Select a known location
       ↓
3. Select disaster type
       ↓
4. Choose two dates with satellite coverage
       ↓
5. Run analysis
       ↓
6. Show BEFORE / AFTER
       ↓
7. Click SHOW AI DETECTED CHANGES
       ↓
8. Explain change mask
       ↓
9. Show affected area + percentage
       ↓
10. Export report
```

## Future Improvements

-   Connect the final trained LEVIR-CD256 checkpoint
-   Add true building-change segmentation
-   Add dedicated SAR-based flood detection
-   Add fire thermal/anomaly data
-   Add confidence calibration
-   Add cloud masking and scene-quality filtering
-   Add GeoTIFF/GeoJSON export
-   Add historical analysis
-   Add multiple disaster events
-   Add model-performance metrics
-   Add authenticated deployment
-   Deploy frontend and backend separately for public access

## License

Add the team's chosen license here before public release.

## Team

**Parallax --- Satellite Disaster Intelligence**

Built as a hackathon prototype combining remote sensing, computer
vision, geospatial analysis, and an interactive web dashboard.
