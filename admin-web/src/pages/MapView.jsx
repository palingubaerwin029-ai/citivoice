import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, resolveImageUrl } from '../services/api';
import { socket } from '../services/socket';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 🔌 Plugins (must come after leaflet)
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet.heat';
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

const CATEGORY_ICONS = {
  'Road & Infrastructure': '🛣️',
  'Electricity': '⚡',
  'Drainage': '🌊',
  'Waste & Sanitation': '🚮',
  'Executive Approval': '🏛️',
};

// --- ICONS ---
const createIcon = (color, category, isHighPriority) => {
  const iconEmoji = CATEGORY_ICONS[category] || '📍';
  
  // The priority badge and pulsing ring
  const priorityBadge = isHighPriority
    ? `<div style="position:absolute; top:-4px; right:-2px; width:22px; height:22px; background:#FF4444; border-radius:50%; border:2.5px solid white; display:flex; align-items:center; justify-content:center; font-size:12px; z-index:10; box-shadow:0 3px 6px rgba(0,0,0,0.5);" title="High Priority">⚠️</div>
       <div style="position:absolute; top:2px; left:5px; width:30px; height:30px; border-radius:50%; border:2px solid #FF4444; animation:pulse 1.2s infinite; pointer-events:none; z-index:-1;"></div>`
    : '';

  return new L.DivIcon({
    className: 'custom-pin',
    iconSize: [40, 48],
    iconAnchor: [20, 46], // Anchored perfectly at the shadow/point
    html: `
      <div style="position:relative; width:40px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:flex-start;">
        ${priorityBadge}
        <!-- Map Shadow -->
        <div style="position:absolute; bottom:0px; width:18px; height:6px; background:rgba(0,0,0,0.6); border-radius:50%; filter:blur(2.5px);"></div>
        
        <!-- Premium Teardrop Marker -->
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          background: linear-gradient(135deg, ${color} 0%, #222 250%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 4px 4px 10px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
          z-index: 2;
        ">
          <!-- Inner White Glow Circle -->
          <div style="
            transform: rotate(45deg);
            width: 20px;
            height: 20px;
            background: #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);
          ">
            <span style="font-size: 11px; margin-top: 1px;">${iconEmoji}</span>
          </div>
        </div>
      </div>
    `,
  });
};

const pulseIcon = new L.DivIcon({
  className: 'custom-pin',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  html: `
    <div style="position:relative; width:26px; height:26px;">
      <div style="background:linear-gradient(135deg, #1A6BFF, #00D4AA); width:18px; height:18px; border-radius:50%; border:2px solid white; position:absolute; top:4px; left:4px; z-index:2; box-shadow: 0 4px 10px rgba(26,107,255,0.6);"></div>
      <div style="background:linear-gradient(135deg, #1A6BFF, #00D4AA); width:18px; height:18px; border-radius:50%; position:absolute; top:4px; left:4px; animation:pulse 1.5s infinite;"></div>
    </div>
  `,
});

function getCityHallDistance(lat, lng) {
  if (!lat || !lng) return null;
  const lat1 = 10.003962;
  const lon1 = 122.805922;
  const lat2 = parseFloat(lat);
  const lon2 = parseFloat(lng);
  if (isNaN(lat2) || isNaN(lon2)) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  const driveMins = Math.max(2, Math.round((d / 30) * 60));
  return { distanceKm: d.toFixed(1), driveMins };
}

function Routing({ selected }) {
  const map = useMap();

  useEffect(() => {
    if (!selected) return;

    const route = L.Routing.control({
      waypoints: [
        L.latLng(10.003962, 122.805922),
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
  const hasFitted = React.useRef(false);
  const lastFilter = React.useRef(filter);

  useEffect(() => {
    if (!Array.isArray(data) || !data.length) return;
    if (!hasFitted.current || lastFilter.current !== filter) {
      const validPoints = data
        .filter((c) => c && c.location_lat && c.location_lng && !isNaN(parseFloat(c.location_lat)))
        .map((c) => [parseFloat(c.location_lat), parseFloat(c.location_lng)]);

      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        hasFitted.current = true;
        lastFilter.current = filter;
      }
    }
  }, [data, filter, map]);

  return null;
}

function HeatmapLayer({ data, visible }) {
  const map = useMap();
  useEffect(() => {
    if (!visible || !Array.isArray(data) || !data.length) return;
    const points = data
      .filter((c) => c && c.location_lat && c.location_lng)
      .map((c) => [parseFloat(c.location_lat), parseFloat(c.location_lng), 1]);
    const heat = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 16 }).addTo(map);
    return () => {
      map.removeLayer(heat);
    };
  }, [data, map, visible]);
  return null;
}

export function MapView() {
  const navigate = useNavigate();
  const [concerns, setConcerns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [mapType, setMapType] = useState(localStorage.getItem('mv_layer') || 'Dark Matter');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [flyCoords, setFlyCoords] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const provider = new OpenStreetMapProvider();

  useEffect(() => {
    localStorage.setItem('mv_filter', filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem('mv_layer', mapType);
  }, [mapType]);

  useEffect(() => {
    api
      .get('/concerns?limit=1000')
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setConcerns(list);
      })
      .catch(console.error);

    const onNewConcern = (newConcern) => {
      setConcerns((prev) => [newConcern, ...(Array.isArray(prev) ? prev : [])]);
    };

    const onUpdateConcern = (updatedConcern) => {
      setConcerns((prev) =>
        (Array.isArray(prev) ? prev : []).map((c) => (c.id === updatedConcern.id ? updatedConcern : c))
      );
      setSelected((prevSelected) => {
        if (prevSelected && prevSelected.id === updatedConcern.id) {
          return updatedConcern;
        }
        return prevSelected;
      });
    };

    socket.on('new_concern', onNewConcern);
    socket.on('update_concern', onUpdateConcern);

    return () => {
      socket.off('new_concern', onNewConcern);
      socket.off('update_concern', onUpdateConcern);
    };
  }, []);

  const concernsList = Array.isArray(concerns) ? concerns : [];

  const counts = {
    pending: concernsList.filter((c) => c.status === 'Pending').length,
    inProgress: concernsList.filter((c) => c.status === 'In Progress').length,
    resolved: concernsList.filter((c) => c.status === 'Resolved').length,
    highPriority: concernsList.filter((c) => c.priority === 'High' && c.status !== 'Resolved').length,
  };

  const filtered = concernsList.filter((c) => {
    if (!c.location_lat || !c.location_lng) return false;
    if (filter !== 'All' && c.status !== filter) return false;
    if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
    if (priorityFilter === 'High' && c.priority !== 'High') return false;
    return true;
  });

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
      {/* 📊 LIVE COMMAND SUMMARY WIDGET */}
      <div className={`${s.glass} ${s.commandWidget}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#00D4AA', textTransform: 'uppercase', marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00D4AA', boxShadow: '0 0 8px #00D4AA' }} />
          Live Command Center
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#FFB800' }}>{counts.pending}</div>
            <div style={{ fontSize: 10, color: '#8899BB' }}>Pending</div>
          </div>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1A6BFF' }}>{counts.inProgress}</div>
            <div style={{ fontSize: 10, color: '#8899BB' }}>In Progress</div>
          </div>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#00D4AA' }}>{counts.resolved}</div>
            <div style={{ fontSize: 10, color: '#8899BB' }}>Resolved</div>
          </div>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#FF4444' }}>{counts.highPriority}</div>
            <div style={{ fontSize: 10, color: '#8899BB' }}>High Priority</div>
          </div>
        </div>
      </div>

      {/* 🔥 FULLSCREEN MAP */}
      <MapContainer
        center={[10.003962, 122.805922]}
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
        <HeatmapLayer data={filtered} visible={showHeatmap} />

        {!showHeatmap && (
          <MarkerClusterGroup chunkedLoading>
            {filtered.map((c) => {
              const lat = parseFloat(c.location_lat);
              const lng = parseFloat(c.location_lng);
              if (isNaN(lat) || isNaN(lng)) return null;
              const color = STATUS_COLORS[c.status] || '#8899BB';
              const isHighPriority = c.priority === 'High';
              return (
                <Marker
                  key={c.id}
                  position={[lat, lng]}
                  icon={createIcon(color, c.category, isHighPriority)}
                  eventHandlers={{ click: () => setSelected(c) }}
                >
                  <Popup className="premium-popup" autoPan={false}>
                    <div style={{ display: 'flex', flexDirection: 'column', width: 220 }}>
                      {c.image_url ? (
                        <div style={{ width: '100%', height: 110, overflow: 'hidden' }}>
                          <img src={resolveImageUrl(c.image_url)} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: 80, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 30 }}>🖼️</span>
                        </div>
                      )}
                      <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.2)' }}>
                        <strong style={{ fontSize: 14, color: '#fff', display: 'block', marginBottom: 4, lineHeight: 1.2 }}>{c.title}</strong>
                        <span style={{ color: color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>● {c.status}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}



        {/* 🎯 Controls Overlay */}
        <div className={s.recenterWrap} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={s.recenterBtn}
            title="Toggle Heatmap"
            style={{ background: showHeatmap ? 'rgba(239, 68, 68, 0.4)' : undefined, borderColor: showHeatmap ? 'rgba(239, 68, 68, 0.8)' : undefined }}
          >
            🔥
          </button>
          <button
            onClick={() => setFlyCoords([10.003962, 122.805922])}
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
        <div className={s.chipRowWrapper}>
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
            {/* Scroll Spacer */}
            <div className={s.chipSpacer} />
          </div>
        </div>

        {/* Category & Priority Filters */}
        <div className={s.chipRowWrapper} style={{ marginTop: 6 }}>
          <div className={s.chipRow}>
            {[
            { key: 'All', label: 'All Categories' },
            { key: 'Road & Infrastructure', label: '🛣️ Roads' },
            { key: 'Electricity', label: '⚡ Electricity' },
            { key: 'Drainage', label: '🌊 Drainage' },
            { key: 'Waste & Sanitation', label: '🚮 Sanitation' },
          ].map(({ key, label }) => {
            const isActive = categoryFilter === key;
            return (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={`${s.chipBtn} ${isActive ? s.chipBtnActive : s.chipBtnInactive}`}
                style={
                  isActive
                    ? { background: '#1A6BFF', borderColor: '#1A6BFF', boxShadow: '0 0 12px rgba(26,107,255,0.4)' }
                    : { background: 'rgba(13,25,48,0.7)', fontSize: 12 }
                }
              >
                {label}
              </button>
            );
          })}

          <button
            onClick={() => setPriorityFilter(priorityFilter === 'High' ? 'All' : 'High')}
            className={`${s.chipBtn}`}
            style={{
              background: priorityFilter === 'High' ? '#FF4444' : 'rgba(239,68,68,0.2)',
              borderColor: '#FF4444',
              color: '#fff',
              boxShadow: priorityFilter === 'High' ? '0 0 12px rgba(255,68,68,0.6)' : 'none',
            }}
          >
            🔥 High Priority
          </button>

          {/* Scroll Spacer */}
          <div className={s.chipSpacer} />
          </div>
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
              <div
                style={{ position: 'relative', cursor: 'zoom-in' }}
                onClick={() => setLightboxImg(resolveImageUrl(selected.image_url))}
              >
                <img
                  src={resolveImageUrl(selected.image_url)}
                  alt="Problem"
                  className={s.sideImage}
                />
                <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 8, fontSize: 11, color: '#fff' }}>
                  🔍 Click to Zoom
                </div>
              </div>
            ) : (
              <div className={s.sideImagePlaceholder}>🖼️</div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span
                  className={s.statusBadge}
                  style={{
                    backgroundColor: STATUS_COLORS[selected.status] + '20',
                    color: STATUS_COLORS[selected.status],
                  }}
                >
                  {selected.status}
                </span>
                {selected.priority === 'High' && (
                  <span style={{ background: 'rgba(255,68,68,0.2)', color: '#FF4444', border: '1px solid rgba(255,68,68,0.4)', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    🔥 High Priority
                  </span>
                )}
              </div>
              <h3 className={s.concernTitle}>{selected.title}</h3>
            </div>

            <p className={s.concernDesc}>{selected.description}</p>

            <div className={s.locationWrap}>
              <div className={s.locationInner}>
                <span className={s.locationIcon}>📍</span>
                <div>
                  <div className={s.locationLabel}>Location</div>
                  <div className={s.locationText}>{selected.location_address || selected.user_barangay || 'Kabankalan City'}</div>
                </div>
              </div>
            </div>

            {/* ETA & Distance Calculation */}
            {selected.location_lat && selected.location_lng && (() => {
              const eta = getCityHallDistance(selected.location_lat, selected.location_lng);
              return eta ? (
                <div style={{ display: 'flex', gap: 12, margin: '12px 0', padding: '10px 14px', background: 'rgba(26,107,255,0.12)', border: '1px solid rgba(26,107,255,0.3)', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#8899BB' }}>Distance from City Hall</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>📍 {eta.distanceKm} km</div>
                  </div>
                  <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#8899BB' }}>Est. Dispatch Drive</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#00D4AA' }}>⏱️ ~{eta.driveMins} mins</div>
                  </div>
                </div>
              ) : null;
            })()}

            <button
              onClick={() => navigate(`/concerns/${selected.id}`)}
              className={s.viewDetailsBtn}
            >
              View More Details
            </button>
          </div>
        )}
      </div>

      {/* 📸 FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {lightboxImg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="Full Preview"
            style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
          />
          <button
            style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 24, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer' }}
            onClick={() => setLightboxImg(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default MapView;
