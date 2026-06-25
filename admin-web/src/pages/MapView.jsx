import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, resolveImageUrl } from '../services/api';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 🔌 Plugins (must come after leaflet)
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { OpenStreetMapProvider } from 'leaflet-geosearch';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  LayersControl,
  LayerGroup,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

// 📦 Cluster CSS
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// 🎨 MapView styles
import s from '../styles/MapView.module.css';

// 🔧 Fix blank/broken marker icons in CRA + Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const STATUS_COLORS = {
  Pending: '#FFB800',
  'In Progress': '#1A6BFF',
  Resolved: '#00D4AA',
  Rejected: '#FF4444',
};

// --- ICONS ---
const createIcon = (color) =>
  new L.DivIcon({
    className: 'custom-pin',
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
  className: 'custom-pin',
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
        L.latLng(9.9868, 122.813),
        L.latLng(parseFloat(selected.location_lat), parseFloat(selected.location_lng)),
      ],
      show: false,
      fitSelectedRoutes: false,
      addWaypoints: false,
      routeWhileDragging: false,
      createMarker: () => null,
    }).addTo(map);

    return () => {
      try {
        // Prevent async callback from crashing if it resolves after component unmounts
        if (route) {
          route._clearLines = () => {};
          map.removeControl(route);
        }
      } catch (_) {
        /* map already destroyed */
      }
    };
  }, [selected]);

  return null;
}

function FlyToMarker({ selected }) {
  const map = useMap();

  useEffect(() => {
    if (!selected) return;
    map.setView([parseFloat(selected.location_lat), parseFloat(selected.location_lng)], 16, {
      animate: true,
      duration: 1,
    });
  }, [selected]);

  return null;
}

function FlyToLocation({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (!coords) return;
    map.setView(coords, 16, { animate: true, duration: 1 });
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
  const navigate = useNavigate();
  const [concerns, setConcerns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState(localStorage.getItem('mv_filter') || 'All');
  const [mapType, setMapType] = useState(localStorage.getItem('mv_layer') || 'Dark Matter');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [flyCoords, setFlyCoords] = useState(null);
  const provider = new OpenStreetMapProvider();

  useEffect(() => {
    localStorage.setItem('mv_filter', filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem('mv_layer', mapType);
  }, [mapType]);

  useEffect(() => {
    api.get('/concerns?limit=1000').then((res) => setConcerns(res.data || [])).catch(console.error);
  }, []);

  const filtered = concerns.filter(
    (c) => c.location_lat && (filter === 'All' || c.status === filter),
  );

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    const results = await provider.search({ query: q });
    setSearchResults(results.slice(0, 5));
  };

  const triggerSearch = async () => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
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
        center={[9.9868, 122.813]}
        zoom={13}
        zoomControl={false}
        className={s.mapWrapper}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked={mapType === 'Dark Matter'} name="Dark Matter">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              eventHandlers={{ add: () => setMapType('Dark Matter') }}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked={mapType === 'Positron (Light)'} name="Positron (Light)">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              eventHandlers={{ add: () => setMapType('Positron (Light)') }}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked={mapType === 'Satellite'} name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community"
              eventHandlers={{ add: () => setMapType('Satellite') }}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <FitBounds data={filtered} filter={filter} />
        <FlyToMarker selected={selected} />
        <FlyToLocation coords={flyCoords} />
        <Routing selected={selected} />

        <MarkerClusterGroup chunkedLoading>
          {filtered.map((c) => {
            const color = STATUS_COLORS[c.status] || '#8899BB';
            return (
              <Marker
                key={c.id}
                position={[parseFloat(c.location_lat), parseFloat(c.location_lng)]}
                icon={c.status === 'In Progress' ? pulseIcon : createIcon(color)}
                eventHandlers={{ click: () => setSelected(c) }}
              >
                <Popup className="premium-popup" autoPan={false}>
                  <div style={{ color: '#000' }}>
                    <strong>{c.title}</strong>
                    <br />
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
        <div className={s.recenterWrap}>
          <button
            onClick={() => setFlyCoords([9.9868, 122.813])}
            className={s.recenterBtn}
            title="Recenter Map"
          >
            🎯
          </button>
        </div>
      </MapContainer>

      {/* 🧭 FLOATING CONTROLS: Search + Chips */}
      <div className={s.floatingControls}>
        {/* Custom Search Bar */}
        <div className={s.searchWrap}>
          <div className={`${s.glass} ${s.searchGlass}`}>
            <button onClick={triggerSearch} className={s.searchIconBtn} title="Search">
              🔍
            </button>
            <input
              className={s.searchInputField}
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
              placeholder="Search address..."
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className={s.searchClearBtn}
              >
                ✕
              </button>
            )}
          </div>
          {/* Results Dropdown */}
          {searchResults.length > 0 && (
            <div className={`${s.glass} ${s.dropdownWrap}`}>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  className={`${s.searchResultItem} ${s.dropdownItem} ${i < searchResults.length - 1 ? s.dropdownItemNotLast : ''}`}
                  onClick={() => handleSelectResult(r)}
                >
                  <span className={s.dropdownIcon}>📍</span>
                  {r.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className={s.chipRow}>
          {[
            { label: 'All', color: '#1A6BFF' },
            { label: 'Pending', color: '#FFB800' },
            { label: 'In Progress', color: '#1A6BFF' },
            { label: 'Resolved', color: '#00D4AA' },
            { label: 'Rejected', color: '#FF4444' },
          ].map(({ label, color }) => {
            const isActive = filter === label;
            return (
              <button
                key={label}
                onClick={() => setFilter(label)}
                className={`${s.chipBtn} ${isActive ? s.chipBtnActive : s.chipBtnInactive}`}
                style={
                  isActive
                    ? { background: color, borderColor: color, boxShadow: `0 0 12px ${color}55` }
                    : {}
                }
              >
                {label !== 'All' && (
                  <span className={s.chipDot} style={{ background: isActive ? '#fff' : color }} />
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
          transform: selected ? 'translateX(24px) translateY(24px) scale(1)' : 'translateX(-110%)',
        }}
      >
        <div className={s.sideHeader}>
          <h2 className={s.sideTitle}>Problem Details</h2>
          <button onClick={() => setSelected(null)} className={s.sideClose}>
            ✕
          </button>
        </div>

        {selected && (
          <div className={s.sideContent}>
            {selected.image_url ? (
              <img
                src={resolveImageUrl(selected.image_url)}
                alt="Problem"
                className={s.sideImage}
              />
            ) : (
              <div className={s.sideImagePlaceholder}>🖼️</div>
            )}

            <div>
              <span
                className={s.statusBadge}
                style={{
                  backgroundColor: STATUS_COLORS[selected.status] + '20',
                  color: STATUS_COLORS[selected.status],
                }}
              >
                {selected.status}
              </span>
              <h3 className={s.concernTitle}>{selected.title}</h3>
            </div>

            <p className={s.concernDesc}>{selected.description}</p>

            <div className={s.locationWrap}>
              <div className={s.locationInner}>
                <span className={s.locationIcon}>📍</span>
                <div>
                  <div className={s.locationLabel}>Location</div>
                  <div className={s.locationText}>{selected.location_address}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/concerns/${selected.id}`)}
              className={s.viewDetailsBtn}
            >
              View More Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
