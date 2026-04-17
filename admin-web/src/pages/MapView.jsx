import React, { useEffect, useState } from "react";
import { api } from "../api";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 🔌 Plugins (must come after leaflet)
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { OpenStreetMapProvider } from "leaflet-geosearch";

import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, LayerGroup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

// 📦 Cluster CSS
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// 🎨 MapView styles
import s from "../styles/MapView.module.css";

// 🔧 Fix blank/broken marker icons in CRA + Leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const STATUS_COLORS = {
  Pending: "#FFB800",
  "In Progress": "#1A6BFF",
  Resolved: "#00D4AA",
  Rejected: "#FF4444",
};



// --- ICONS ---
const createIcon = (color) =>
  new L.DivIcon({
    className: "custom-pin",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    html: `
      <svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 8 12 20 12 20S24 20 24 12C24 5.373 18.627 0 12 0z"
          fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="4.5" fill="white"/>
      </svg>
    `,
  });

const pulseIcon = new L.DivIcon({
  className: "custom-pin",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  html: `
    <div style="position:relative; width:24px; height:24px;">
      <div style="background:#1A6BFF; width:16px; height:16px; border-radius:50%; border:3px solid white; position:absolute; top:4px; left:4px; z-index:2;"></div>
      <div style="background:#1A6BFF; width:16px; height:16px; border-radius:50%; position:absolute; top:4px; left:4px; animation:pulse 1.5s infinite;"></div>
    </div>
  `,
});

function Routing({ selected }) {
  const map = useMap();

  useEffect(() => {
    if (!selected) return;

    const route = L.Routing.control({
      waypoints: [
        L.latLng(9.9868, 122.8130),
        L.latLng(parseFloat(selected.location_lat), parseFloat(selected.location_lng)),
      ],
      show: false,
    }).addTo(map);

    return () => map.removeControl(route);
  }, [selected]);

  return null;
}

function FlyToMarker({ selected }) {
  const map = useMap();

  useEffect(() => {
    if (!selected) return;
    map.flyTo([parseFloat(selected.location_lat), parseFloat(selected.location_lng)], 16, { duration: 1.5 });
  }, [selected]);

  return null;
}

function FlyToLocation({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (!coords) return;
    map.flyTo(coords, 16, { duration: 1.5 });
  }, [coords]);
  return null;
}
// Auto fit map
function FitBounds({ data, filter }) {
  const map = useMap();
  const lastFilter = React.useRef(filter);

  useEffect(() => {
    if (!data.length) return;
    if (lastFilter.current !== filter || lastFilter.current === undefined) {
      const bounds = L.latLngBounds(
        data.map((c) => [parseFloat(c.location_lat), parseFloat(c.location_lng)]),
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      lastFilter.current = filter;
    }
  }, [data, filter]);

  return null;
}

export function MapView() {
  const [concerns, setConcerns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [flyCoords, setFlyCoords] = useState(null);
  const provider = new OpenStreetMapProvider();

  useEffect(() => {
    api.get("/concerns").then(setConcerns).catch(console.error);
  }, []);

  const filtered = concerns.filter(
    (c) => c.location_lat && (filter === "All" || c.status === filter),
  );

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length < 3) { setSearchResults([]); return; }
    const results = await provider.search({ query: q });
    setSearchResults(results.slice(0, 5));
  };

  const triggerSearch = async () => {
    if (searchQuery.length < 3) { setSearchResults([]); return; }
    const results = await provider.search({ query: searchQuery });
    setSearchResults(results.slice(0, 5));
  };

  const handleSelectResult = (result) => {
    setFlyCoords([result.y, result.x]);
    setSearchQuery(result.label);
    setSearchResults([]);
  };

  return (
    <div className={s.container}>
      {/* 🔥 FULLSCREEN MAP */}
      <MapContainer
        center={[9.9868, 122.8130]}
        zoom={13}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Dark Matter">
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Positron (Light)">
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer 
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <FitBounds data={filtered} filter={filter} />
        <FlyToMarker selected={selected} />
        <FlyToLocation coords={flyCoords} />
        <Routing selected={selected} />

        <MarkerClusterGroup chunkedLoading>
          {filtered.map((c) => {
            const color = STATUS_COLORS[c.status] || "#8899BB";
            return (
              <Marker
                key={c.id}
                position={[parseFloat(c.location_lat), parseFloat(c.location_lng)]}
                icon={c.status === "In Progress" ? pulseIcon : createIcon(color)}
                eventHandlers={{ click: () => setSelected(c) }}
              >
                <Popup className="premium-popup">
                  <div style={{ color: "#000" }}>
                    <strong>{c.title}</strong><br />
                    <span style={{ color: color }}>● {c.status}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        {/* 🗺️ Map Legend Overlay */}
        <div className={s.legendOverlay}>
          <div className={s.legendHeader}>Status Guide</div>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className={s.legendItem}>
              <span className={s.legendDot} style={{ background: color }} />
              <span className={s.legendLabel}>{status}</span>
            </div>
          ))}
        </div>

        {/* 🎯 Recenter Button */}
        <div style={{ position: "absolute", bottom: 24, right: 24, zIndex: 1000, pointerEvents: "all" }}>
           <button 
             onClick={() => setFlyCoords([9.9868, 122.8130])}
             className={s.recenterBtn}
             title="Recenter Map"
           >
             🎯
           </button>
        </div>
      </MapContainer>

      {/* 🧭 FLOATING CONTROLS: Search + Chips */}
      <div className={s.floatingControls}>
        {/* Custom Search Bar — needs pointer-events re-enabled */}
        <div style={{ position: "relative", pointerEvents: "all" }}>
          <div className={s.glass} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
            <button 
              onClick={triggerSearch}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, opacity: 0.8, padding: 0 }}
              title="Search"
            >
              🔍
            </button>
            <input
              className={s.searchInput}
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
              placeholder="Search address..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                style={{ background: "none", border: "none", color: "#8899BB", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
              >✕</button>
            )}
          </div>
          {/* Results Dropdown */}
          {searchResults.length > 0 && (
            <div className={s.glass} style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              zIndex: 2000,
              padding: 0,
              overflow: "hidden",
            }}>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  className={s.searchResultItem}
                  onClick={() => handleSelectResult(r)}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    color: "#fff",
                    fontSize: 14,
                    borderBottom: i < searchResults.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  }}
                >
                  <span style={{ marginRight: 10, opacity: 0.5 }}>📍</span>
                  {r.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter Chips — needs pointer-events re-enabled */}
        <div style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          pointerEvents: "all",
        }} className={s.chipRow}>
          {[
            { label: "All",         color: "#1A6BFF" },
            { label: "Pending",     color: "#FFB800" },
            { label: "In Progress", color: "#1A6BFF" },
            { label: "Resolved",    color: "#00D4AA" },
            { label: "Rejected",    color: "#FF4444" },
          ].map(({ label, color }) => {
            const isActive = filter === label;
            return (
              <button
                key={label}
                onClick={() => setFilter(label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  fontWeight: 700,
                  flexShrink: 0,
                  background: isActive ? color : "rgba(13, 25, 48, 0.75)",
                  color: isActive ? "#fff" : "#8899BB",
                  border: isActive ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: isActive ? `0 0 12px ${color}55` : "0 4px 12px rgba(0,0,0,0.3)",
                  transition: "all 0.2s",
                }}
              >
                {label !== "All" && (
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: isActive ? "#fff" : color,
                    display: "inline-block", flexShrink: 0,
                  }} />
                )}
                {label}
              </button>
            );
          })}
        </div>

      </div>

      {/* 📋 SIDE PANEL */}
      <div
        className={`${s.sidePanel} ${s.glass}`}
        style={{
          transform: selected ? "translateX(24px) translateY(24px) scale(1)" : "translateX(-110%)",
          height: "calc(100% - 48px)",
          borderRadius: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>Problem Details</h2>
          <button
            onClick={() => setSelected(null)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ width: "100%", height: 180, backgroundColor: "#162B4D", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
              🖼️
            </div>

            <div>
              <span style={{ backgroundColor: STATUS_COLORS[selected.status] + "20", color: STATUS_COLORS[selected.status], padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                {selected.status}
              </span>
              <h3 style={{ color: "#fff", fontSize: 24, marginTop: 12, lineHeight: 1.2 }}>
                {selected.title}
              </h3>
            </div>

            <p style={{ color: "#8899BB", fontSize: 15, lineHeight: 1.6 }}>
              {selected.description}
            </p>

            <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "auto" }}>
              <div style={{ display: "flex", gap: 10, color: "#fff", alignItems: "flex-start" }}>
                <span style={{ fontSize: 20 }}>📍</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Location</div>
                  <div style={{ color: "#8899BB", fontSize: 14 }}>{selected.location_address}</div>
                </div>
              </div>
            </div>

            <button style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", backgroundColor: "#1A6BFF", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              View More Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
