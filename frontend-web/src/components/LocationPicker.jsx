import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Loader2, MapPin, Search } from 'lucide-react';
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
const LocationPicker = ({ position, onPositionChange, label, onLabelChange, changed = false }) => {
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
    <div className="stack-sm">
      <div className="loc-search">
        <div className="input-icon-wrap grow">
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            className="input"
            placeholder="Search a town or area…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search location"
          />
        </div>
        <button type="button" className="btn btn-secondary" onClick={useMyLocation}>
          <Navigation size={16} aria-hidden="true" /> <span className="hide-sm">Current location</span>
        </button>
        {(searching || results.length > 0) && (
          <div className="loc-results" role="listbox" aria-label="Places">
            {searching && <div className="menu-item muted">Searching…</div>}
            {results.map((r) => (
              <button type="button" role="option" aria-selected="false" key={r.place_id} className="menu-item" onClick={() => choose(r)}>
                <MapPin size={14} aria-hidden="true" style={{ flexShrink: 0 }} /> <span className="truncate">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="map-box" style={{ height: 300 }}>
        <MapContainer center={position ? [position.lat, position.lng] : COLOMBO} zoom={12} style={{ height: '100%', width: '100%' }}>
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
      <span className="field-hint">Click the map or drag the pin to set the exact spot.</span>

      <div className={`field ${changed ? 'changed' : ''}`}>
        <label className="field-label" htmlFor="f-location">Location name<span className="req" aria-hidden="true">*</span></label>
        <div className="input-icon-wrap">
          <MapPin size={16} aria-hidden="true" />
          <input
            id="f-location"
            type="text"
            className="input"
            name="location"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={position ? 'Location name' : 'Click the map to drop a pin'}
            aria-label="Location name"
            maxLength={120}
          />
        </div>
        {geoBusy && <span className="field-hint row" style={{ gap: 6 }}><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Looking up the place name…</span>}
      </div>
      {message && <div className="alert alert-warning" role="status">{message}</div>}
    </div>
  );
};

export default LocationPicker;
