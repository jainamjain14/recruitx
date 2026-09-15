import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CompanyLocationMap, decodeHtmlEntities } from '../components/CompanyLocationMap';
import { api } from '../services/api';
import {
  Briefcase,
  MapPin,
  IndianRupee,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  ShieldCheck,
  Send,
  Map,
  ListFilter,
  Navigation,
  Mail,
  Compass,
  SlidersHorizontal,
} from 'lucide-react';
import {
  LocalityItem,
  ALL_INDIA_LOCALITIES,
  REGIONAL_CATEGORIES,
  MUMBAI_NEIGHBORHOODS,
} from '../data/indiaLocalities';
export type { LocalityItem };
export { ALL_INDIA_LOCALITIES, REGIONAL_CATEGORIES, MUMBAI_NEIGHBORHOODS };

interface CompanyJob {
  company: string;
  logo: string;
  title: string;
  location: string;
  workMode: string;
  salary: string;
  posted: string;
  jobUrl: string;
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  matchPercentage: number;
  lat: number;
  lng: number;
  distanceMiles?: number;
  hrEmail?: string;
}

const PRESET_INDIAN_CITIES = [
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Delhi NCR', state: 'Delhi/Gurgaon/Noida', lat: 28.6139, lng: 77.2090 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
];

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};



const resolveDetailedLocation = (lat: number, lng: number): { shortLabel: string; fullLabel: string } => {
  // First check if within 5.5 km of a specific known neighborhood / IT corridor across India
  let bestSub: LocalityItem | null = null;
  let minSubDist = Infinity;
  for (const sub of ALL_INDIA_LOCALITIES) {
    const d = calculateDistance(lat, lng, sub.lat, sub.lng);
    if (d < minSubDist) {
      minSubDist = d;
      bestSub = sub;
    }
  }

  if (bestSub && minSubDist <= 5.5) {
    return {
      shortLabel: `${bestSub.name}, ${bestSub.city}`,
      fullLabel: `${bestSub.name}, ${bestSub.city} (Live Pinpoint)`,
    };
  }

  // Otherwise check preset cities within 75 km
  let nearestCity = PRESET_INDIAN_CITIES[0];
  let minCityDist = Infinity;
  for (const c of PRESET_INDIAN_CITIES) {
    const d = calculateDistance(lat, lng, c.lat, c.lng);
    if (d < minCityDist) {
      minCityDist = d;
      nearestCity = c;
    }
  }

  if (minCityDist <= 75) {
    return {
      shortLabel: `${nearestCity.name}, ${nearestCity.state}`,
      fullLabel: `${nearestCity.name}, ${nearestCity.state} (Live GPS Pin)`,
    };
  }

  return {
    shortLabel: `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`,
    fullLabel: `GPS (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E), India`,
  };
};

export const StudentJobs: React.FC = () => {
  const [targetDomain, setTargetDomain] = useState('Marketing & Growth Management');
  const [companyJobs, setCompanyJobs] = useState<CompanyJob[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'nearby' | 'high_match' | 'remote'>('nearby');
  const [nearbyRadius, setNearbyRadius] = useState<number>(50); // 50 km default radius
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [appliedCompany, setAppliedCompany] = useState<string[]>([]);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // GPS Permission Prompt State
  const [gpsModalOpen, setGpsModalOpen] = useState(false);
  const [gpsErrorReason, setGpsErrorReason] = useState<string>('');
  const [gpsPermissionState, setGpsPermissionState] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');
  const [locatingGps, setLocatingGps] = useState<boolean>(false);

  // Retrieve cached location or default to Andheri West, Mumbai (19.1351, 72.8290)
  const getInitialLocation = () => {
    try {
      const savedLat = localStorage.getItem('user_device_lat');
      const savedLng = localStorage.getItem('user_device_lng');
      const savedCity = localStorage.getItem('user_device_city');
      if (savedLat && savedLng) {
        const lat = parseFloat(savedLat);
        const lng = parseFloat(savedLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, city: savedCity || 'Andheri West, Mumbai' };
        }
      }
    } catch {}
    return { lat: 19.1351, lng: 72.8290, city: 'Andheri West, Mumbai' };
  };

  const initialLoc = getInitialLocation();

  // User's Physical / Device Location
  const [deviceLat, setDeviceLat] = useState<number>(initialLoc.lat);
  const [deviceLng, setDeviceLng] = useState<number>(initialLoc.lng);
  const [deviceCity, setDeviceCity] = useState<string>(initialLoc.city);

  // Active Search Center
  const [userLat, setUserLat] = useState<number>(initialLoc.lat);
  const [userLng, setUserLng] = useState<number>(initialLoc.lng);
  const [userCity, setUserCity] = useState<string>(initialLoc.city);
  const [locationMode, setLocationMode] = useState<'gps' | 'metro'>('gps');

  // Locality Search State
  const [localitySearchText, setLocalitySearchText] = useState('');
  const [isLocalitySearchOpen, setIsLocalitySearchOpen] = useState(false);

  useEffect(() => {
    // Proactively check browser geolocation permission status
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          setGpsPermissionState(status.state as any);
          if (status.state === 'granted') {
            detectLocationAndFetch(false);
          }
          status.onchange = () => {
            setGpsPermissionState(status.state as any);
            if (status.state === 'granted') {
              detectLocationAndFetch(false);
            }
          };
        })
        .catch(() => {});
    }
    fetchCompanyMatches(initialLoc.lat, initialLoc.lng);
    fetchExistingApplications();
  }, []);

  const handleManualLocationChange = (lat: number, lng: number) => {
    const resolved = resolveDetailedLocation(lat, lng);
    setLocationMode('gps');
    setDeviceLat(lat);
    setDeviceLng(lng);
    setDeviceCity(resolved.shortLabel);
    setUserLat(lat);
    setUserLng(lng);
    setUserCity(resolved.fullLabel);
    try {
      localStorage.setItem('user_device_lat', lat.toString());
      localStorage.setItem('user_device_lng', lng.toString());
      localStorage.setItem('user_device_city', resolved.shortLabel);
    } catch {}
    fetchCompanyMatches(lat, lng);
  };

  const handleSelectLocality = (loc: LocalityItem) => {
    handleManualLocationChange(loc.lat, loc.lng);
    setGpsModalOpen(false);
    setIsLocalitySearchOpen(false);
    setLocalitySearchText('');
  };

  const detectLocationAndFetch = (isUserClick: boolean = false) => {
    if (!('geolocation' in navigator)) {
      if (isUserClick) {
        setGpsErrorReason('Geolocation is not supported by your web browser.');
        setGpsModalOpen(true);
      }
      return;
    }

    if (isUserClick) {
      setLocatingGps(true);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const resolved = resolveDetailedLocation(lat, lng);
        setGpsPermissionState('granted');
        setLocationMode('gps');
        setDeviceLat(lat);
        setDeviceLng(lng);
        setDeviceCity(resolved.shortLabel);
        setUserLat(lat);
        setUserLng(lng);
        setUserCity(resolved.fullLabel);
        try {
          localStorage.setItem('user_device_lat', lat.toString());
          localStorage.setItem('user_device_lng', lng.toString());
          localStorage.setItem('user_device_city', resolved.shortLabel);
        } catch {}
        fetchCompanyMatches(lat, lng);
        setGpsModalOpen(false);
      },
      (err) => {
        setLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsPermissionState('denied');
        }
        if (isUserClick) {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsErrorReason(
              'Location permission was blocked in your browser. Click the lock/settings icon on the left of your URL bar (localhost:5173), toggle Location to "Allow", and reload.'
            );
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setGpsErrorReason(
              'Your computer\'s GPS / Windows Location Service is currently turned OFF. On Windows, open Settings > Privacy & Security > Location and turn ON "Location services" and "Let apps access your location".'
            );
          } else if (err.code === err.TIMEOUT) {
            setGpsErrorReason(
              'Location request timed out. Please choose your exact neighborhood below (e.g. Andheri West).'
            );
          } else {
            setGpsErrorReason('Unable to acquire live GPS location from your device.');
          }
          setGpsModalOpen(true);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const fetchCompanyMatches = async (lat: number = userLat, lng: number = userLng) => {
    setLoading(true);
    try {
      const res = await api.get(`/jobs/company-matches?userLat=${lat}&userLng=${lng}`);
      if (res.data?.data) {
        setTargetDomain(res.data.data.targetDomain || 'Marketing & Growth Management');
        setCompanyJobs(res.data.data.companies || []);
      }
    } catch (err) {
      console.error('Failed to fetch company job matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingApplications = async () => {
    try {
      const res = await api.get('/applications');
      const apps = res.data?.data?.applications || [];
      const appliedKeys = apps.map((a: any) => `${a.companyName || a.job?.company}-${a.jobTitle || a.job?.title}`);
      setAppliedCompany(appliedKeys);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNativeApply = async (company: string, title: string, hrEmail?: string) => {
    const key = `${company}-${title}`;
    setApplyingKey(key);

    try {
      const res = await api.post('/applications/apply-direct', {
        companyName: decodeHtmlEntities(company),
        jobTitle: decodeHtmlEntities(title),
        hrEmail,
      });

      setAppliedCompany((prev) => [...prev, key]);
      alert(`🎉 ${res.data?.message || `Application for ${title} at ${company} submitted successfully with your uploaded resume!`}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplyingKey(null);
    }
  };

  const filteredJobs = companyJobs.filter((job) => {
    const cleanCompany = decodeHtmlEntities(job.company).toLowerCase();
    const cleanTitle = decodeHtmlEntities(job.title).toLowerCase();
    const cleanLocation = job.location.toLowerCase();
    const cleanSearch = search.toLowerCase();

    const matchesSearch =
      cleanCompany.includes(cleanSearch) ||
      cleanTitle.includes(cleanSearch) ||
      cleanLocation.includes(cleanSearch) ||
      job.requiredSkills.some((s) => s.toLowerCase().includes(cleanSearch));

    if (!matchesSearch) return false;

    if (filterMode === 'nearby') {
      const dist = locationMode === 'gps'
        ? calculateDistance(deviceLat, deviceLng, job.lat, job.lng)
        : (job.distanceMiles ?? calculateDistance(userLat, userLng, job.lat, job.lng));
      return dist <= nearbyRadius;
    }
    if (filterMode === 'high_match') return job.matchPercentage >= 70;
    if (filterMode === 'remote') return job.workMode.toLowerCase().includes('remote') || cleanLocation.includes('remote');
    return true;
  });

  // Compute live search matches across all India localities
  const filteredLocalities = localitySearchText.trim()
    ? ALL_INDIA_LOCALITIES.filter((loc) => {
        const query = localitySearchText.toLowerCase();
        return (
          loc.name.toLowerCase().includes(query) ||
          loc.city.toLowerCase().includes(query) ||
          loc.state.toLowerCase().includes(query) ||
          loc.categoryLabel.toLowerCase().includes(query)
        );
      }).slice(0, 20)
    : [];

  return (
    <div className="space-y-6">
      {/* GPS Location Request / Error Modal */}
      {gpsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 space-y-4 bg-white border-neutral-300 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900">Browser Location Permission & Pinpoint</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {gpsErrorReason || 'Location access is required to automatically pinpoint companies near you across India.'}
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 space-y-2">
              <p className="font-semibold text-neutral-900">How to enable real-time location in browser:</p>
              <div className="space-y-1 text-[11.5px] text-neutral-600">
                <p>1. <strong>In Chrome/Edge:</strong> Click the 🔒 lock or tune icon in the address bar (left of the URL) and set <strong>Location</strong> to <strong>Allow</strong>.</p>
                <p>2. <strong>In Windows Settings:</strong> Open Settings &gt; Privacy &amp; Security &gt; Location &gt; ensure <strong>Location Services</strong> and <strong>Let apps access location</strong> are ON.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 text-xs text-neutral-600">
              <p>
                💡 You can also dismiss this window and use the search bar on the page to instantly pinpoint any neighborhood, city, or tech park in India.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setGpsModalOpen(false)}>
                Dismiss
              </Button>
              <Button
                size="sm"
                disabled={locatingGps}
                onClick={() => detectLocationAndFetch(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                {locatingGps ? (
                  <>
                    <Sparkles className="w-3 h-3 animate-spin" />
                    Querying GPS...
                  </>
                ) : (
                  <>
                    <Navigation className="w-3 h-3 fill-current" />
                    Retry Browser GPS
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">India Job Matches & Company Vacancies</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              🇮🇳 Live Openings (₹ LPA)
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Indian company job openings verified relative to <span className="font-semibold text-neutral-900">{userCity}</span> for:{' '}
            <span className="font-semibold text-neutral-900">{targetDomain}</span>
          </p>
        </div>

        {/* View Toggle Mode */}
        <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            List View ({filteredJobs.length})
          </button>

          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'map' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Map className="w-3.5 h-3.5 text-emerald-400" />
            Interactive Map ({filteredJobs.length})
          </button>
        </div>
      </div>

      {/* Geolocation Permission Request Banner */}
      {gpsPermissionState !== 'granted' && (
        <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-neutral-950 text-white p-4 rounded-xl border border-emerald-500/40 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 shrink-0">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white">Browser Location &amp; India Pinpoint</h3>
                <span className="text-[10px] font-semibold bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full">
                  {gpsPermissionState === 'denied' ? 'Permission Denied in Browser' : 'Live Real-Time GPS'}
                </span>
              </div>
              <p className="text-[11.5px] text-neutral-300 mt-0.5">
                {gpsPermissionState === 'denied'
                  ? 'Location access was blocked in browser settings. Search or select any locality across India below, or allow access via the URL bar lock icon.'
                  : 'Allow browser location access to pinpoint your live GPS coordinates anywhere in India and calculate exact road distances to nearby companies and tech parks.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => detectLocationAndFetch(true)}
              disabled={locatingGps}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shrink-0 shadow-md flex items-center gap-1.5"
            >
              {locatingGps ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Requesting GPS...
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 fill-current" />
                  Allow Live Location Access
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Location & GPS Proximity Toolbar */}
      <div className="p-3.5 bg-neutral-900 text-white rounded-xl border border-neutral-800 shadow-md space-y-3">
        {/* Row 1: Origin display, GPS trigger, and Radius filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-neutral-300 font-medium">Distance Origin:</span>
            <span className="font-bold text-emerald-400 bg-neutral-800 px-2.5 py-1 rounded border border-neutral-700 flex items-center gap-1.5 shadow-sm">
              {locationMode === 'gps' ? '🛰️ Live Pinpoint:' : '📍 Metro Center:'} {userCity}
              <span className="text-[10px] text-neutral-400 font-normal">
                ({deviceLat.toFixed(3)}°N, {deviceLng.toFixed(3)}°E)
              </span>
            </span>
            <button
              type="button"
              onClick={() => detectLocationAndFetch(true)}
              disabled={locatingGps}
              className={`text-[11px] py-1 px-3 rounded-md font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                locationMode === 'gps'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-400 ring-1 ring-emerald-400/40'
                  : 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-500'
              }`}
            >
              {locatingGps ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Querying GPS...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 text-white fill-current shrink-0" />
                  <span>Use My GPS Pin</span>
                </>
              )}
            </button>
          </div>

          {filterMode === 'nearby' && (
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-neutral-300">Nearby Radius:</span>
              <div className="flex items-center gap-1">
                {[15, 25, 50, 100].map((r) => (
                  <button
                    key={r}
                    onClick={() => setNearbyRadius(r)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                      nearbyRadius === r
                        ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-bold'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                    }`}
                  >
                    &lt; {r} km
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Interactive All-India Locality Search Bar with Autocomplete Dropdown */}
        <div className="relative pt-1 border-t border-neutral-800">
          <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-700 focus-within:border-emerald-400 transition-colors">
            <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <input
              type="text"
              placeholder="🔍 Search ANY locality or IT park in India (e.g. Borivali, Dadar, Fort, Hinjewadi, Whitefield, Sector 62, Cyber City...)"
              value={localitySearchText}
              onChange={(e) => {
                setLocalitySearchText(e.target.value);
                setIsLocalitySearchOpen(true);
              }}
              onFocus={() => setIsLocalitySearchOpen(true)}
              className="bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none w-full"
            />
            {localitySearchText && (
              <button
                type="button"
                onClick={() => {
                  setLocalitySearchText('');
                  setIsLocalitySearchOpen(false);
                }}
                className="text-neutral-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isLocalitySearchOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsLocalitySearchOpen(false)}
              />
              {filteredLocalities.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-neutral-950 border border-neutral-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 divide-y divide-neutral-800">
                  {filteredLocalities.map((loc) => (
                    <button
                      key={`${loc.name}-${loc.city}-${loc.lat}`}
                      type="button"
                      onClick={() => handleSelectLocality(loc)}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-800 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                        <div>
                          <span className="text-xs font-bold text-white group-hover:text-emerald-400">
                            {loc.name}
                          </span>
                          <span className="text-[10px] text-neutral-400 ml-2">
                            ({loc.city}, {loc.state})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 group-hover:border-emerald-500/50 group-hover:text-emerald-300">
                          {loc.categoryLabel}
                        </span>
                        <span className="text-[9px] text-neutral-500 font-mono">
                          {loc.lat.toFixed(2)}°N, {loc.lng.toFixed(2)}°E
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterMode('nearby')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
              filterMode === 'nearby'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <MapPin className="w-3 h-3 text-emerald-400" />
            Nearby ({nearbyRadius} km Radius)
          </button>

          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All India Openings ({companyJobs.length})
          </button>

          <button
            onClick={() => setFilterMode('high_match')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filterMode === 'high_match'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            High Match (70%+)
          </button>

          <button
            onClick={() => setFilterMode('remote')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filterMode === 'remote'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Remote / Hybrid
          </button>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Indian company or skill..."
          className="w-full sm:w-64 text-xs"
        />
      </div>

      {/* Main Content Area: Map View vs List View */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-xs text-neutral-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-neutral-900" />
            Fetching live Indian company job vacancies and computing exact GPS distances...
          </p>
        </div>
      ) : viewMode === 'map' ? (
        /* Leaflet Interactive Map View with Live Drag Pin */
        <CompanyLocationMap
          companies={filteredJobs}
          userLat={userLat}
          userLng={userLng}
          userCity={userCity}
          deviceLat={deviceLat}
          deviceLng={deviceLng}
          deviceCity={deviceCity}
          locationMode={locationMode}
          hasGpsPermission={gpsPermissionState === 'granted'}
          onRequestLocation={() => detectLocationAndFetch(true)}
          onLocationChange={handleManualLocationChange}
          onApply={(comp, title, hrEmail) => handleNativeApply(comp, title, hrEmail)}
          appliedKeys={appliedCompany}
        />
      ) : filteredJobs.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <p className="text-xs font-semibold text-neutral-700">
            No matching vacant Indian company jobs found within {filterMode === 'nearby' ? `${nearbyRadius} km of ${userCity}` : 'this filter'}.
          </p>
          <p className="text-xs text-neutral-400">
            Switch to <strong>"All India Openings"</strong> to view all 29+ vacancies across Indian production houses and tech hubs.
          </p>
          <Button size="sm" variant="secondary" onClick={() => setFilterMode('all')} className="mt-2">
            View All India Openings
          </Button>
        </Card>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 gap-6">
          {filteredJobs.map((job, idx) => {
            const companyKey = `${job.company}-${job.title}`;
            const isApplied = appliedCompany.includes(companyKey);
            const isApplying = applyingKey === companyKey;
            const distFromActiveCenter = Math.round(job.distanceMiles ?? 0);
            const distFromDevice = Math.round(calculateDistance(deviceLat, deviceLng, job.lat, job.lng));
            const isNearby = locationMode === 'gps'
              ? distFromDevice <= nearbyRadius
              : distFromActiveCenter <= nearbyRadius;

            return (
              <Card key={idx} className="p-6 space-y-4 border-neutral-200 hover:border-neutral-300 transition-all">
                {/* Top Row: Company Info, Proximity Distance & Match Badge */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                      <img
                        src={job.logo}
                        alt={job.company}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <Building2 className="w-6 h-6 text-neutral-400" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-neutral-900">{decodeHtmlEntities(job.title)}</h2>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {job.workMode}
                        </span>
                        {isNearby && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> Nearby (&lt;{nearbyRadius} km)
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs">
                        <span className="font-bold text-neutral-900">{decodeHtmlEntities(job.company)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          {locationMode === 'gps'
                            ? (distFromDevice <= 1
                                ? 'Within 1 km of your GPS location'
                                : `${distFromDevice} km from your GPS location`)
                            : (distFromActiveCenter <= 2
                                ? `Within ${userCity.split(',')[0]} center (< 2 km)`
                                : `${distFromActiveCenter} km from ${userCity.split(',')[0]} center`)}
                          <span className="text-neutral-500 font-normal">({job.location})</span>
                        </span>

                        {locationMode === 'metro' && isDifferentFromDevice && (
                          <>
                            <span className="text-neutral-300">•</span>
                            <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 flex items-center gap-1">
                              <Navigation className="w-2.5 h-2.5 text-neutral-500 shrink-0" />
                              {distFromDevice} km from your GPS ({deviceCity.split(',')[0]})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span
                        className={`inline-block text-xs font-black px-2.5 py-1 rounded border ${
                          job.matchPercentage >= 75
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {job.matchPercentage}% Match
                      </span>
                      <p className="text-[10px] text-neutral-400 mt-1">{job.posted}</p>
                    </div>
                  </div>
                </div>

                {/* Middle Row: Salary in Rupees (₹ LPA) & Per-Company Skill Gap Breakdown */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-600 gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 font-bold text-neutral-900">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-700" /> Compensation: {job.salary}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {job.salary.includes('Disclosed') ? '✓ Employer Disclosed CTC' : '✓ AmbitionBox Market Benchmark'}
                      </span>
                    </div>
                    <span className="text-neutral-400">Skill Gap Breakdown for {decodeHtmlEntities(job.company)}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-md border border-neutral-200">
                    {/* Matching Skills Candidate Possesses */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Matching Skills You Possess ({job.matchedSkills.length})</span>
                      </div>
                      {job.matchedSkills.length === 0 ? (
                        <p className="text-[11px] text-neutral-400 italic">No matching skills found in your resume.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {job.matchedSkills.map((sk) => (
                            <span
                              key={sk}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"
                            >
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Missing Skills Required by This Specific Company */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Skills You Need for {decodeHtmlEntities(job.company)} ({job.missingSkills.length})</span>
                      </div>
                      {job.missingSkills.length === 0 ? (
                        <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                          ✨ You meet 100% of {decodeHtmlEntities(job.company)}'s requirements!
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {job.missingSkills.map((sk) => (
                            <span
                              key={sk}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-200"
                            >
                              + {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Native 1-Click Apply Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                    <span>
                      Hiring Inbox:{' '}
                      <strong className="text-neutral-700">
                        {job.hrEmail || `careers@${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                      </strong>
                    </span>
                  </div>
                  <Button
                    onClick={() => handleNativeApply(job.company, job.title, job.hrEmail)}
                    disabled={isApplied || isApplying}
                    size="sm"
                    className="flex items-center gap-1.5"
                    variant={isApplied ? 'secondary' : 'primary'}
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Application Sent (Resume Attached)
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        {isApplying ? 'Submitting Application...' : `Apply Now to ${decodeHtmlEntities(job.company)}`}
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
