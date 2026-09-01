/* ==========================================================
   PARALLAX FRONTEND CONTROLLER
   ========================================================== */

const API_URL = "http://127.0.0.1:8000";
let selectedLocation = null;
let selectedDisaster = "auto";
let map = null;
let marker = null;
let latestAnalysis = null;

const $ = (id) => document.getElementById(id);

function scrollToSection(id) {
    const el = $(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showMapStatus(message, type = "") {
    const el = $("mapStatus");
    if (!el) return;
    el.textContent = message;
    el.className = `map-status ${type}`.trim();
}

function setCoordinates(lat, lon, moveMap = true) {
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        showMapStatus("Enter valid latitude (-90 to 90) and longitude (-180 to 180).", "error");
        return false;
    }

    selectedLocation = { lat: latitude, lng: longitude };
    $("latitudeInput").value = latitude.toFixed(6);
    $("longitudeInput").value = longitude.toFixed(6);
    $("coordinatesDisplay").textContent = `LAT ${latitude.toFixed(4)}  •  LNG ${longitude.toFixed(4)}`;

    if (map && moveMap) map.setView([latitude, longitude], Math.max(map.getZoom(), 10));
    if (map) {
        if (marker) marker.setLatLng([latitude, longitude]);
        else marker = L.marker([latitude, longitude]).addTo(map);
        marker.bindPopup(`Selected location<br>${latitude.toFixed(5)}, ${longitude.toFixed(5)}`).openPopup();
    }
    return true;
}

function initMap() {
    const mapEl = $("parallaxMap");
    if (!mapEl || typeof L === "undefined") return;

    map = L.map(mapEl, { zoomControl: true, attributionControl: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    map.on("click", (e) => {
        setCoordinates(e.latlng.lat, e.latlng.lng, false);
        showMapStatus(`Location selected: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}. Choose dates and analyze.`, "success");
    });

    setTimeout(() => map.invalidateSize(), 300);
}

function initDateDefaults() {
    const before = $("beforeDate");
    const after = $("afterDate");
    if (!before || !after) return;
    const now = new Date();
    const afterDate = new Date(now);
    afterDate.setDate(now.getDate() - 14);
    const beforeDate = new Date(now);
    beforeDate.setDate(now.getDate() - 60);
    const fmt = d => d.toISOString().slice(0, 10);
    if (!before.value) before.value = fmt(beforeDate);
    if (!after.value) after.value = fmt(afterDate);
}

function setImage(id, src) {
    const el = $(id);
    if (el && src) el.src = src;
}

function updateResultBanner(data) {
    const info = {
        flood: ["🌊", "FLOOD", "Water-covered regions detected in the selected area."],
        wildfire: ["🔥", "WILDFIRE", "Burn-related spectral change detected in the selected area."],
        vegetation: ["🌱", "VEGETATION", "Vegetation loss or disturbance detected in the selected area."]
    }[data.active_mode] || ["◈", String(data.active_mode || "CHANGE").toUpperCase(), "Significant surface change detected in the selected area."];

    if ($("resultDisasterIcon")) $("resultDisasterIcon").textContent = info[0];
    if ($("resultDisasterName")) $("resultDisasterName").textContent = info[1];
    if ($("resultDisasterDescription")) $("resultDisasterDescription").textContent = info[2];
    if ($("sliderDescription")) $("sliderDescription").textContent = `${info[1]} analysis • ${data.dates.before_scene} → ${data.dates.after_scene}`;

    const scores = data.scores || {};
    if ($("floodPercentage")) $("floodPercentage").textContent = `${((scores.flood || 0) * 100 / 4).toFixed(1)}%`;
    if ($("wildfirePercentage")) $("wildfirePercentage").textContent = `${((scores.wildfire || 0) * 100 / 3.5).toFixed(1)}%`;
    if ($("buildingPercentage")) $("buildingPercentage").textContent = `${((scores.vegetation || 0) * 100 / 2.8).toFixed(1)}%`;
}

function updateDashboard(data) {
    latestAnalysis = data;
    $("affectedArea").textContent = data.stats.affected_area;
    $("changeArea").textContent = data.stats.change_area;
    $("changePercentage").textContent = data.stats.percentage;
    $("confidence").textContent = data.stats.confidence;
    $("donutValue").textContent = data.stats.change_area.replace(" km²", "");

    updateResultBanner(data);

    setImage("beforeSatelliteImage", data.before_image);
    setImage("afterSatelliteImage", data.after_image);
    setImage("dashboardImage", data.after_image);

    const overlay = document.querySelector(".change-overlay");
    if (overlay && data.change_image) {
        overlay.style.backgroundImage = `url(${data.change_image})`;
        overlay.style.backgroundSize = "cover";
        overlay.style.backgroundPosition = "center";
        overlay.style.opacity = "0";
    }

    const pct = parseFloat(data.stats.percentage) || 0;
    if ($("impactLevel")) $("impactLevel").textContent = pct >= 20 ? "HIGH" : pct >= 8 ? "MODERATE" : "LOW";
    if ($("impactDescription")) $("impactDescription").textContent = `${data.stats.change_area} affected by detected ${data.active_mode} change (${data.stats.percentage} of the analysis area).`;

    document.querySelectorAll(".comparison-tab").forEach(btn => btn.classList.remove("active"));
    const firstTab = document.querySelector('.comparison-tab[data-view="after"]');
    if (firstTab) firstTab.classList.add("active");
    $("comparisonLabel").textContent = "AFTER";
}

function setupComparisonTabs() {
    document.querySelectorAll(".comparison-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            if (!latestAnalysis) return;
            document.querySelectorAll(".comparison-tab").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const view = btn.dataset.view;
            const image = $("dashboardImage");
            const overlay = document.querySelector(".change-overlay");
            if (view === "before") {
                image.src = latestAnalysis.before_image;
                overlay.style.opacity = "0";
                $("comparisonLabel").textContent = "BEFORE";
            } else if (view === "after") {
                image.src = latestAnalysis.after_image;
                overlay.style.opacity = "0";
                $("comparisonLabel").textContent = "AFTER";
            } else {
                image.src = latestAnalysis.after_image;
                overlay.style.opacity = latestAnalysis.change_image ? "1" : "0";
                $("comparisonLabel").textContent = "AI CHANGE MAP";
            }
        });
    });
}

function setupBeforeAfterSlider() {
    const slider = $("beforeAfterSlider");
    const wrapper = $("beforeImageWrapper");
    const handle = $("sliderHandle");
    if (!slider || !wrapper || !handle) return;

    let dragging = false;
    const update = (clientX) => {
        const rect = slider.getBoundingClientRect();
        const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        wrapper.style.width = `${pct}%`;
        handle.style.left = `${pct}%`;
    };
    const start = e => { dragging = true; update(e.touches ? e.touches[0].clientX : e.clientX); };
    const move = e => { if (dragging) update(e.touches ? e.touches[0].clientX : e.clientX); };
    const stop = () => { dragging = false; };
    slider.addEventListener("mousedown", start);
    slider.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
}

async function startMapAnalysis() {
    const before = $("beforeDate");
    const after = $("afterDate");
    const disaster = $("disasterType");
    const latInput = $("latitudeInput");
    const lonInput = $("longitudeInput");
    const button = $("mapAnalyzeButton");

    if (!selectedLocation) {
        if (!setCoordinates(latInput.value, lonInput.value)) return;
    }
    if (!before.value || !after.value) return showMapStatus("Please select both Before and After dates.", "error");
    if (after.value <= before.value) return showMapStatus("After date must be later than Before date.", "error");

    selectedDisaster = disaster ? disaster.value : "auto";
    button.disabled = true;
    button.innerHTML = "ANALYZING <span>...</span>";
    showMapStatus(`Querying satellite archives for ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}...`);

    try {
        const response = await fetch(`${API_URL}/api/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                lat: selectedLocation.lat,
                lon: selectedLocation.lng,
                before_date: before.value,
                after_date: after.value,
                zoom_km: 4.0,
                selected_disaster: selectedDisaster
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Server analysis error");
        updateDashboard(data);

        $("parallaxSlider").style.display = "block";
        $("aiChangeStatus").textContent = "AI change mask generated. Use the slider or CHANGE MAP tab to inspect it.";
        scrollToSection("dashboard");
        showMapStatus(`Analysis complete: ${data.active_mode.toUpperCase()} • ${data.dates.before_scene} → ${data.dates.after_scene}`, "success");
    } catch (error) {
        console.error(error);
        showMapStatus(`Analysis failed: ${error.message}`, "error");
    } finally {
        button.disabled = false;
        button.innerHTML = "ANALYZE DISASTER <span>→</span>";
    }
}

function setupControls() {
    $("mapAnalyzeButton")?.addEventListener("click", startMapAnalysis);
    $("disasterType")?.addEventListener("change", e => { selectedDisaster = e.target.value; });

    [$("latitudeInput"), $("longitudeInput")].forEach(input => {
        input?.addEventListener("change", () => {
            const lat = $("latitudeInput").value;
            const lon = $("longitudeInput").value;
            if (lat && lon) setCoordinates(lat, lon);
        });
    });

    $("showChangesButton")?.addEventListener("click", () => {
        if (!latestAnalysis) return;
        const tab = document.querySelector('.comparison-tab[data-view="change"]');
        tab?.click();
        $("aiChangeStatus").textContent = "AI detected regions are highlighted in the change map.";
        scrollToSection("dashboard");
    });

    $("exportReportButton")?.addEventListener("click", exportReport);
}

function exportReport() {
    if (!latestAnalysis) return alert("Run an analysis before exporting a report.");
    const d = latestAnalysis;
    const text = [
        "PARALLAX — SATELLITE DISASTER INTELLIGENCE REPORT",
        "=================================================",
        `Location: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`,
        `Mode: ${String(d.active_mode).toUpperCase()}`,
        `Before scene: ${d.dates.before_scene}`,
        `After scene: ${d.dates.after_scene}`,
        `Affected area: ${d.stats.affected_area}`,
        `Detected change: ${d.stats.change_area}`,
        `Change: ${d.stats.percentage}`,
        `Confidence: ${d.stats.confidence}`
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "parallax-analysis-report.txt";
    a.click();
    URL.revokeObjectURL(a.href);
}

window.addEventListener("DOMContentLoaded", () => {
    initMap();
    initDateDefaults();
    setupControls();
    setupComparisonTabs();
    setupBeforeAfterSlider();

    const loader = $("loader");
    if (loader) setTimeout(() => loader.classList.add("hidden"), 700);
});
