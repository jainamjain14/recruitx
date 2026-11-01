import React, { useEffect, useRef, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  MapPin,
  Building2,
  Send,
  IndianRupee,
  ExternalLink,
  Navigation,
  Crosshair,
  Route,
  Layers,
} from 'lucide-react';

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .trim();
}

export interface CompanyMapItem {
  company: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  distanceMiles?: number;
  matchPercentage: number;
  salary: string;
  logo: string;
  jobUrl?: string;
  matchedSkills: string[];
  hrEmail?: string;
}

interface CompanyLocationMapProps {
  companies: CompanyMapItem[];
  userLat?: number;
  userLng?: number;
  userCity?: string;
  deviceLat?: number;
  deviceLng?: number;
  deviceCity?: string;
  locationMode?: 'gps' | 'metro';
  hasGpsPermission?: boolean;
  onRequestLocation?: () => void;
  onLocationChange?: (lat: number, lng: number) => void;
  onApply: (company: string, title: string, hrEmail?: string) => void;
  appliedKeys: string[];
}

const calculateDistanceBetween = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const CompanyLocationMap: React.FC<CompanyLocationMapProps> = ({
  companies,
  userLat,
  userLng,
  userCity = 'Location not set',
  deviceLat,
  deviceLng,
  deviceCity = 'Location not set',
  locationMode = 'gps',
  hasGpsPermission = false,
  onRequestLocation,
  onLocationChange,
  onApply,
  appliedKeys,
}) => {
  const [selectedCompany, setSelectedCompany] = useState<CompanyMapItem | null>(companies[0] || null);
  const [mapMode, setMapMode] = useState<'leaflet_live' | 'google_directions'>('leaflet_live');
  const [leafletReady, setLeafletReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  // Sync selected company when list changes
  useEffect(() => {
    if (companies.length > 0) {
      if (!selectedCompany || !companies.some((c) => c.company === selectedCompany.company && c.title === selectedCompany.title)) {
        setSelectedCompany(companies[0]);
      }
    } else {
      setSelectedCompany(null);
    }
  }, [companies]);

  // Check if Leaflet window.L is ready
  useEffect(() => {
    const checkLeaflet = () => {
      if ((window as any).L) {
        setLeafletReady(true);
      } else {
        setTimeout(checkLeaflet, 100);
      }
    };
    checkLeaflet();
  }, []);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (mapMode !== 'leaflet_live') return;
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Teardown existing instance if present
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const hasUserLoc = (deviceLat !== undefined && deviceLng !== undefined) || (userLat !== undefined && userLng !== undefined);
    const liveLat = deviceLat ?? userLat ?? 20.5937;
    const liveLng = deviceLng ?? userLng ?? 78.9629;

    const map = L.map(mapContainerRef.current, {
      center: [liveLat, liveLng],
      zoom: hasUserLoc ? 12 : 5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    leafletMapRef.current = map;

    // Allow user to click anywhere on the map to set their live pin!
    map.on('click', (e: any) => {
      if (onLocationChange) {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      }
    });

    const bounds: [number, number][] = [];

    // 1. Plot Live User Marker if user location is set
    if (hasUserLoc) {
      const userIcon = L.divIcon({
        className: 'custom-live-user-marker',
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;cursor:grab;">
            <span style="position:absolute;width:34px;height:34px;border-radius:50%;background:#3b82f6;opacity:0.45;animation:ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <span style="position:relative;width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></span>
            <span style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;font-weight:800;background:#0f172a;color:#ffffff;padding:2px 6px;border-radius:4px;box-shadow:0 2px 5px rgba(0,0,0,0.3);border:1px solid #334155;">
              📍 You (Drag Me)
            </span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const userMarker = L.marker([liveLat, liveLng], {
        icon: userIcon,
        zIndexOffset: 1000,
        draggable: true,
      }).addTo(map);

      userMarker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        if (onLocationChange) {
          onLocationChange(pos.lat, pos.lng);
        }
      });

      userMarker.bindPopup(`
        <div style="font-family:sans-serif;padding:3px;font-size:11px;">
          <div style="font-weight:bold;color:#2563eb;font-size:12px;">📍 Your Live Location Pin</div>
          <div style="color:#1e293b;margin-top:2px;">${deviceCity || userCity}</div>
          <div style="color:#64748b;font-size:10px;margin-top:2px;">${liveLat.toFixed(4)}°N, ${liveLng.toFixed(4)}°E</div>
          <div style="color:#059669;font-size:9.5px;font-weight:bold;margin-top:4px;">💡 Drag this pin or click anywhere to adjust your exact location!</div>
        </div>
      `);

      // Radius circle showing precision accuracy
      L.circle([liveLat, liveLng], {
        radius: 350,
        color: '#3b82f6',
        fillColor: '#93c5fd',
        fillOpacity: 0.18,
        weight: 1.5,
      }).addTo(map);

      bounds.push([liveLat, liveLng]);
    }

    // 2. Plot Company Markers
    companies.forEach((comp) => {
      const isSelected = selectedCompany && comp.company === selectedCompany.company && comp.title === selectedCompany.title;
      bounds.push([comp.lat, comp.lng]);

      const compIcon = L.divIcon({
        className: 'custom-company-marker',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
            <div style="background:${isSelected ? '#059669' : '#1e293b'};color:#ffffff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:2.5px solid ${isSelected ? '#34d399' : '#ffffff'};box-shadow:0 3px 8px rgba(0,0,0,0.4);font-size:14px;transition:all 0.2s;">
              🏢
            </div>
            <div style="font-size:9.5px;font-weight:700;background:${isSelected ? '#059669' : '#ffffff'};color:${isSelected ? '#ffffff' : '#0f172a'};padding:1px 6px;border-radius:3px;border:1px solid ${isSelected ? '#047857' : '#cbd5e1'};box-shadow:0 1px 4px rgba(0,0,0,0.2);white-space:nowrap;margin-top:2px;">
              ${decodeHtmlEntities(comp.company)}
            </div>
          </div>
        `,
        iconSize: [30, 42],
        iconAnchor: [15, 30],
      });

      const marker = L.marker([comp.lat, comp.lng], { icon: compIcon, zIndexOffset: isSelected ? 500 : 100 }).addTo(map);
      marker.on('click', () => {
        setSelectedCompany(comp);
      });
      marker.bindPopup(`
        <div style="font-family:sans-serif;padding:3px;max-width:220px;font-size:11px;">
          <div style="font-weight:bold;color:#0f172a;font-size:12px;">${decodeHtmlEntities(comp.company)}</div>
          <div style="color:#059669;font-weight:600;">${decodeHtmlEntities(comp.title)}</div>
          <div style="color:#64748b;margin-top:2px;">📍 ${comp.location}</div>
          <div style="font-weight:bold;color:#1e293b;margin-top:3px;">💰 ${comp.salary}</div>
          <div style="color:#2563eb;font-weight:600;margin-top:2px;">
            Distance: ${hasUserLoc ? `~${calculateDistanceBetween(liveLat, liveLng, comp.lat, comp.lng)} km` : (comp.distanceMiles ? `~${Math.round(comp.distanceMiles)} km` : 'N/A')}
          </div>
        </div>
      `);
    });

    // 3. Polyline Distance Vector Connecting User's Live Pin directly to Selected Company
    if (hasUserLoc && selectedCompany) {
      const line = L.polyline(
        [[liveLat, liveLng], [selectedCompany.lat, selectedCompany.lng]],
        { color: '#059669', weight: 3.5, dashArray: '6, 8', opacity: 0.9 }
      ).addTo(map);

      const distKm = calculateDistanceBetween(liveLat, liveLng, selectedCompany.lat, selectedCompany.lng);
      line.bindTooltip(`${distKm} km (${(deviceCity || 'Your Pin').split(',')[0]} ➔ ${selectedCompany.company})`, {
        permanent: true,
        direction: 'center',
        className: 'bg-emerald-900 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-md border border-emerald-500',
      });
    }

    // Auto fit bounds comfortably
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 12);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapMode, leafletReady, companies, selectedCompany, deviceLat, deviceLng, userLat, userLng, deviceCity, userCity]);

  // Recenter controls
  const handleCenterOnMe = () => {
    const lat = deviceLat ?? userLat;
    const lng = deviceLng ?? userLng;
    if (lat !== undefined && lng !== undefined && leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 14, { animate: true });
    }
  };

  const handleCenterOnCompany = () => {
    if (selectedCompany && leafletMapRef.current) {
      leafletMapRef.current.setView([selectedCompany.lat, selectedCompany.lng], 15, { animate: true });
    }
  };

  const handleFitRoute = () => {
    if (selectedCompany && leafletMapRef.current) {
      const liveLat = deviceLat ?? userLat;
      const liveLng = deviceLng ?? userLng;
      if (liveLat !== undefined && liveLng !== undefined) {
        leafletMapRef.current.fitBounds(
          [
            [liveLat, liveLng],
            [selectedCompany.lat, selectedCompany.lng],
          ],
          { padding: [60, 60], maxZoom: 14 }
        );
      } else {
        leafletMapRef.current.setView([selectedCompany.lat, selectedCompany.lng], 14, { animate: true });
      }
    }
  };

  if (companies.length === 0) {
    return (
      <Card className="p-10 text-center space-y-3 bg-neutral-50 border-neutral-200">
        <MapPin className="w-8 h-8 text-neutral-400 mx-auto" />
        <h3 className="text-sm font-bold text-neutral-900">No Job Locations Within This Radius</h3>
        <p className="text-xs text-neutral-500 max-w-md mx-auto">
          No vacant positions found near <span className="font-semibold text-neutral-800">{userCity}</span> with your active filter. Try switching to <strong>"All India Openings"</strong> or adjusting your search.
        </p>
      </Card>
    );
  }

  const activeLiveLat = deviceLat ?? userLat;
  const activeLiveLng = deviceLng ?? userLng;
  const hasActiveLoc = activeLiveLat !== undefined && activeLiveLng !== undefined;

  return (
    <div className="space-y-3">
      {/* Map Mode & Navigation Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900 text-white px-4 py-2.5 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-white">Live Job Proximity Map</span>
          {selectedCompany && (
            <span className="text-[11px] text-neutral-400 hidden md:inline">
              — Selected: <strong className="text-white">{decodeHtmlEntities(selectedCompany.company)}</strong> {hasActiveLoc ? `(~${calculateDistanceBetween(activeLiveLat, activeLiveLng, selectedCompany.lat, selectedCompany.lng)} km away)` : ''}
            </span>
          )}
        </div>

        {/* Provider Switch Toggle */}
        <div className="flex items-center gap-1 bg-neutral-800 p-1 rounded-lg border border-neutral-700 text-xs">
          <button
            onClick={() => setMapMode('leaflet_live')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              mapMode === 'leaflet_live' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-300 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            Live Multi-Pin Map
          </button>
          <button
            onClick={() => setMapMode('google_directions')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              mapMode === 'google_directions' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-300 hover:text-white'
            }`}
          >
            <Route className="w-3 h-3 text-amber-300" />
            Google Driving Route
          </button>
        </div>
      </div>

      {/* Main Map View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Map View */}
        <div className="lg:col-span-2 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-100 min-h-[480px] relative">
          {/* Helpful interaction guidance badge */}
          {mapMode === 'leaflet_live' && (
            <div className="absolute top-3 left-3 z-[400] bg-neutral-900/90 text-white backdrop-blur px-2.5 py-1.5 rounded-md border border-neutral-700 text-[10px] font-medium flex items-center gap-1.5 shadow-md max-w-xs">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0"></span>
              <span>Drag your blue pin or click anywhere on the map to set your live location!</span>
            </div>
          )}

          {/* Quick Centering Action Floating Bar (For Leaflet Mode) */}
          {mapMode === 'leaflet_live' && (
            <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 bg-white/95 backdrop-blur px-2 py-1 rounded-md border border-neutral-300 shadow-md text-xs">
              <button
                onClick={handleCenterOnMe}
                title="Center map on your live GPS position"
                className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 border border-blue-200 flex items-center gap-1 text-[11px]"
              >
                <Crosshair className="w-3 h-3" />
                My GPS Pin
              </button>
              <button
                onClick={handleCenterOnCompany}
                title="Center map on selected company"
                className="px-2 py-1 rounded bg-neutral-100 text-neutral-700 font-semibold hover:bg-neutral-200 border border-neutral-200 flex items-center gap-1 text-[11px]"
              >
                <Building2 className="w-3 h-3 text-emerald-700" />
                Company Pin
              </button>
              <button
                onClick={handleFitRoute}
                title="Fit both your GPS pin and company pin in view"
                className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 text-[11px]"
              >
                <Route className="w-3 h-3" />
                Fit Route
              </button>
            </div>
          )}

          {/* Leaflet OpenStreetMap Container */}
          {mapMode === 'leaflet_live' ? (
            <div ref={mapContainerRef} className="w-full h-[500px] z-0" />
          ) : (
            /* Google Driving Directions Iframe Route Embed */
            <iframe
              title="Google Maps Turn-by-Turn Route from GPS to Company"
              width="100%"
              height="100%"
              className="min-h-[500px] w-full border-0"
              loading="lazy"
              allowFullScreen
              src={
                hasActiveLoc
                  ? `https://maps.google.com/maps?saddr=${activeLiveLat},${activeLiveLng}&daddr=${
                      selectedCompany
                        ? encodeURIComponent(`${selectedCompany.company}, ${selectedCompany.location}`)
                        : `${userLat || 20.5937},${userLng || 78.9629}`
                    }&output=embed`
                  : `https://maps.google.com/maps?q=${
                      selectedCompany
                        ? encodeURIComponent(`${selectedCompany.company}, ${selectedCompany.location}`)
                        : 'India'
                    }&output=embed`
              }
            />
          )}

          {/* Floating Selected Company Overlay Card */}
          {selectedCompany && (
            <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 backdrop-blur p-3.5 rounded-lg border border-neutral-300 shadow-xl max-w-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-neutral-100 border border-neutral-200 p-1 shrink-0 flex items-center justify-center">
                    <img
                      src={selectedCompany.logo}
                      alt={selectedCompany.company}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <Building2 className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">{decodeHtmlEntities(selectedCompany.title)}</h4>
                    {(() => {
                      const distFromGps = hasActiveLoc
                        ? calculateDistanceBetween(activeLiveLat!, activeLiveLng!, selectedCompany.lat, selectedCompany.lng)
                        : null;
                      const distFromCenter = Math.round(selectedCompany.distanceMiles ?? 0);

                      if (locationMode === 'gps') {
                        return (
                          <p className="text-[11px] font-semibold text-neutral-700 flex flex-wrap items-center gap-1.5">
                            <span>{decodeHtmlEntities(selectedCompany.company)}</span>
                            {distFromGps !== null && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                  {distFromGps <= 1
                                    ? 'Within 1 km of your GPS location'
                                    : `${distFromGps} km from your GPS location`}
                                </span>
                              </>
                            )}
                          </p>
                        );
                      }

                      return (
                        <p className="text-[11px] font-semibold text-neutral-700 flex flex-wrap items-center gap-1.5">
                          <span>{decodeHtmlEntities(selectedCompany.company)}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            {distFromCenter <= 2
                              ? `Within ${userCity.split(',')[0]} center (< 2 km)`
                              : `${distFromCenter} km from ${userCity.split(',')[0]} center`}
                          </span>
                          {distFromGps !== null && (
                            <span className="text-[10px] text-neutral-600 font-medium bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                              • {distFromGps} km from your GPS ({(deviceCity || '').split(',')[0]})
                            </span>
                          )}
                        </p>
                      );
                    })()}
                    <div className="flex items-center gap-3 pt-0.5">
                      <a
                        href={
                          hasActiveLoc
                            ? `https://www.google.com/maps/dir/?api=1&origin=${activeLiveLat},${activeLiveLng}&destination=${encodeURIComponent(
                                `${selectedCompany.company}, ${selectedCompany.location}`
                              )}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                `${selectedCompany.company}, ${selectedCompany.location}`
                              )}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10.5px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {hasActiveLoc ? 'Open Google Maps Turn-by-Turn Route' : 'View on Google Maps'}
                      </a>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {selectedCompany.matchPercentage}% Match
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-neutral-200 mt-2.5">
                <div>
                  <span className="text-[11px] font-bold text-neutral-900 flex items-center gap-0.5">
                    <IndianRupee className="w-3 h-3 text-neutral-700" /> {selectedCompany.salary}
                  </span>
                  <span className="text-[9.5px] text-neutral-500 block mt-0.5">
                    {selectedCompany.salary.includes('Disclosed') ? 'Employer Disclosed CTC' : 'AmbitionBox Market Benchmark'}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onApply(selectedCompany.company, selectedCompany.title, selectedCompany.hrEmail)}
                  disabled={appliedKeys.includes(`${selectedCompany.company}-${selectedCompany.title}`)}
                  className="flex items-center gap-1 text-xs"
                >
                  <Send className="w-3 h-3" />
                  {appliedKeys.includes(`${selectedCompany.company}-${selectedCompany.title}`) ? 'Tracked ✓' : 'Apply Now'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Company Sidebar List */}
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Vacancies Relative to You ({companies.length})
            </h4>
            <span className="text-[10.5px] text-neutral-500">Sorted by Distance</span>
          </div>

          {companies.map((comp, idx) => {
            const isSelected = selectedCompany?.company === comp.company && selectedCompany?.title === comp.title;
            const distFromGps = hasActiveLoc ? calculateDistanceBetween(activeLiveLat!, activeLiveLng!, comp.lat, comp.lng) : null;
            const distFromCenter = Math.round(comp.distanceMiles ?? 0);
            const metroName = userCity.split(',')[0].trim();

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedCompany(comp);
                  if (leafletMapRef.current) {
                    leafletMapRef.current.setView([comp.lat, comp.lng], 14, { animate: true });
                  }
                }}
                className={`p-3 rounded-lg border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                    : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold">{decodeHtmlEntities(comp.title)}</h5>
                    <p className={`text-[11px] ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {decodeHtmlEntities(comp.company)}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-emerald-400 text-neutral-950'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {comp.matchPercentage}%
                  </span>
                </div>

                <div className="space-y-1 pt-1 border-t border-dashed border-neutral-200/40">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span
                      className={`flex items-center gap-1 font-bold ${
                        isSelected ? 'text-emerald-300' : 'text-emerald-700'
                      }`}
                    >
                      <MapPin className="w-3 h-3 shrink-0" />
                      {locationMode === 'gps' && distFromGps !== null
                        ? (distFromGps <= 1 ? 'Within 1 km of your GPS' : `${distFromGps} km from your GPS`)
                        : (distFromCenter > 0
                            ? (distFromCenter <= 2 ? `Within ${metroName} center` : `${distFromCenter} km from center`)
                            : 'Open opening')}
                    </span>
                    <span className={isSelected ? 'text-neutral-300 font-semibold' : 'text-neutral-700 font-semibold'}>
                      {comp.salary}
                    </span>
                  </div>

                  <p className={`text-[10px] ${isSelected ? 'text-neutral-400' : 'text-neutral-500'} flex items-center justify-between`}>
                    <span>📍 {comp.location}</span>
                    {locationMode === 'metro' && distFromGps !== null && (
                      <span className="text-[9.5px] italic text-neutral-400">
                        {distFromGps} km from your GPS
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
