import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Loader2, MapPin } from 'lucide-react';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

const COLOMBO = [6.9271, 79.8612];
const NOMINATIM = 'https://nominatim.openstreetmap.org';

// Short label from a Nominatim result, e.g. "Kollupitiya, Colombo".
const shortLabel = (data) => {
  const a = data?.address || {};
  const place = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.road;
  const city = a.city || a.town || a.county || a.state_district;
  const parts = [place, city].filter(Boolean);
  const unique = parts.filter((p, i) => parts.indexOf(p) === i);
  return unique.length ? unique.join(', ') : (data?.display_name || '').split(',').slice(0, 2).join(',').trim();
};

const ClickToPin = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
};

const FollowPin = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], Math.max(map.getZoom(), 13));
  }, [position, map]);
  return null;
};

/**
 * One location section: search box, map pin (click or drag), "current location" button and an
 * editable label. Moving the pin fills the label using Nominatim reverse geocoding.
 */
const LocationPicker = ({ position, onPositionChange, label, onLabelChange, inputStyle }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [message, setMessage] = useState('');
  const searchTimer = useRef(null);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const reverseGeocode = async (pos) => {
    setGeoBusy(true);
    setMessage('');
    try {
      const res = await fetch(`${NOMINATIM}/reverse?format=json&zoom=16&addressdetails=1&lat=${pos.lat}&lon=${pos.lng}`);
      if (!res.ok) throw new Error(`Map service error ${res.status}`);
      const name = shortLabel(await res.json());
      if (name) onLabelChange(name);
      else setMessage('Could not find a place name here. Please type the location.');
    } catch (err) {
      setMessage(`Could not look up this place (${err.message}). Please type the location.`);
    } finally {
      setGeoBusy(false);
    }
  };

  const pick = (pos) => {
    onPositionChange(pos);
    reverseGeocode(pos);
  };

  const handleSearch = (value) => {
    setQuery(value);
    clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    // Nominatim allows about 1 request per second, so wait until the user stops typing.
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      setMessage('');
      try {
        const res = await fetch(`${NOMINATIM}/search?format=json&addressdetails=1&limit=6&countrycodes=lk&q=${encodeURIComponent(value)}`);
        if (!res.ok) throw new Error(`Map service error ${res.status}`);
        const data = await res.json();
        setResults(data);
        if (data.length === 0) setMessage('No places found. Try another name or click on the map.');
      } catch (err) {
        setMessage(`Search failed (${err.message}). Click on the map instead.`);
      } finally {
        setSearching(false);
      }
    }, 800);
  };

  const choose = (r) => {
    const pos = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    onPositionChange(pos);
    onLabelChange(shortLabel(r));
    setQuery('');
    setResults([]);
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setMessage('Your browser cannot share its location. Click on the map instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => pick({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => setMessage(`Could not get your location (${err.message}). Click on the map instead.`)
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Search a town or area..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          style={inputStyle}
          aria-label="Search location"
        />
        <button type="button" onClick={useMyLocation} style={{ ...inputStyle, width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Navigation size={16} /> Current location
        </button>
        {(searching || results.length > 0) && (
          <div style={{ position: 'absolute', top: '48px', left: 0, right: 0, background: '#1f1b2e', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', zIndex: 1000, maxHeight: '220px', overflowY: 'auto' }}>
            {searching && <div style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Searching...</div>}
            {results.map((r) => (
              <button
                type="button"
                key={r.place_id}
                onClick={() => choose(r)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer' }}
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: '280px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
        <MapContainer center={position ? [position.lat, position.lng] : COLOMBO} zoom={12} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
          <ClickToPin onPick={pick} />
          {position && (
            <Marker
              position={[position.lat, position.lng]}
              draggable
              eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); pick({ lat: ll.lat, lng: ll.lng }); } }}
            />
          )}
          <FollowPin position={position} />
        </MapContainer>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MapPin size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        <input
          type="text"
          name="location"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder={position ? 'Location name' : 'Click the map to drop a pin'}
          style={inputStyle}
          aria-label="Location name"
          maxLength={120}
        />
        {geoBusy && <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0 }} />}
      </div>
      {message && <div style={{ color: '#ffd43b', fontSize: '0.85rem' }}>{message}</div>}
    </div>
  );
};

export default LocationPicker;
