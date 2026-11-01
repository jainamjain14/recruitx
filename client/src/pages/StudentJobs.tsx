import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ExternalLink,
  ListFilter,
  Navigation,
  Mail,
  Compass,
  SlidersHorizontal,
  Zap,
  Globe,
  X,
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
  isPlatformJob?: boolean;
  isVerifiedActive?: boolean;
  verificationSource?: string;
  applicationType?: string;
  directApplyUrl?: string;
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
      fullLabel: `${bestSub.name}, ${bestSub.city}`,
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
      fullLabel: `${nearestCity.name}, ${nearestCity.state}`,
    };
  }

  return {
    shortLabel: `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`,
    fullLabel: `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E, India`,
  };
};

export const StudentJobs: React.FC = () => {
  const navigate = useNavigate();
  const [targetDomain, setTargetDomain] = useState('Marketing & Growth Management');
  const [companyJobs, setCompanyJobs] = useState<CompanyJob[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'nearby' | 'high_match' | 'remote'>('nearby');
  const [nearbyRadius, setNearbyRadius] = useState<number>(50); // 50 km default radius
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [appliedCompany, setAppliedCompany] = useState<string[]>([]);
  const [existingAppsMap, setExistingAppsMap] = useState<Record<string, any>>({});
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-Apply Permission & Execution State
  const [autoApplyModalOpen, setAutoApplyModalOpen] = useState(false);
  const [autoApplyConsent, setAutoApplyConsent] = useState(false);
  const [autoApplyMinScore, setAutoApplyMinScore] = useState<number>(75);
  const [autoApplyMaxApps, setAutoApplyMaxApps] = useState<number>(5);
  const [autoApplying, setAutoApplying] = useState(false);
  const [autoApplyError, setAutoApplyError] = useState<string | null>(null);
  const [autoApplyResult, setAutoApplyResult] = useState<{
    appliedCount: number;
    submittedCount?: number;
    requiresManualCount?: number;
    submittedApplications?: any[];
    manualReviewApplications?: any[];
    message?: string;
    applications?: any[];
  } | null>(null);

  // GPS Permission Prompt State
  const [gpsModalOpen, setGpsModalOpen] = useState(false);
  const [gpsErrorReason, setGpsErrorReason] = useState<string>('');
  const [gpsPermissionState, setGpsPermissionState] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');
  const [locatingGps, setLocatingGps] = useState<boolean>(false);

  // Retrieve cached location or null if not yet determined/allowed
  const getInitialLocation = (): { lat: number; lng: number; city: string } | null => {
    try {
      const savedLat = localStorage.getItem('user_device_lat');
      const savedLng = localStorage.getItem('user_device_lng');
      const savedCity = localStorage.getItem('user_device_city');
      if (savedLat && savedLng) {
        const lat = parseFloat(savedLat);
        const lng = parseFloat(savedLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, city: savedCity || 'Saved Location' };
        }
      }
    } catch {}
    return null;
  };

  const initialLoc = getInitialLocation();

  // User's Physical / Device Location
  const [deviceLat, setDeviceLat] = useState<number | null>(initialLoc?.lat ?? null);
  const [deviceLng, setDeviceLng] = useState<number | null>(initialLoc?.lng ?? null);
  const [deviceCity, setDeviceCity] = useState<string>(initialLoc?.city || 'Location not set');

  // Active Search Center
  const [userLat, setUserLat] = useState<number | null>(initialLoc?.lat ?? null);
  const [userLng, setUserLng] = useState<number | null>(initialLoc?.lng ?? null);
  const [userCity, setUserCity] = useState<string>(initialLoc?.city || 'All India (Location not set)');
  const [locationMode, setLocationMode] = useState<'gps' | 'metro'>(initialLoc ? 'gps' : 'metro');

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
    if (initialLoc) {
      fetchCompanyMatches(initialLoc.lat, initialLoc.lng);
    } else {
      fetchCompanyMatches();
    }
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

  const fetchCompanyMatches = async (lat?: number | null, lng?: number | null) => {
    setLoading(true);
    try {
      const activeLat = lat !== undefined ? lat : userLat;
      const activeLng = lng !== undefined ? lng : userLng;
      const queryParams = (activeLat !== null && activeLng !== null && activeLat !== undefined && activeLng !== undefined)
        ? `?userLat=${activeLat}&userLng=${activeLng}`
        : '';
      const res = await api.get(`/jobs/company-matches${queryParams}`);
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

      const appMap: Record<string, any> = {};
      apps.forEach((a: any) => {
        const comp = (a.companyName || a.job?.company || '').toLowerCase().trim();
        const tit = (a.jobTitle || a.job?.title || '').toLowerCase().trim();
        appMap[`${comp}-${tit}`] = a;
        appMap[`${a.companyName || a.job?.company}-${a.jobTitle || a.job?.title}`] = a;
      });
      setExistingAppsMap(appMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNativeApply = async (company: string, title: string, hrEmail?: string, jobUrl?: string, isPlatformJob?: boolean) => {
    const key = `${company}-${title}`;
    setApplyingKey(key);

    try {
      const res = await api.post('/applications/apply-direct', {
        companyName: decodeHtmlEntities(company),
        jobTitle: decodeHtmlEntities(title),
        hrEmail,
        jobUrl,
      });

      setAppliedCompany((prev) => [...prev, key]);
      
      if (res.data?.data?.requiresManualAction && res.data.data.officialApplyUrl) {
        window.open(res.data.data.officialApplyUrl, '_blank', 'noopener,noreferrer');
        alert(`📋 Application tracker established for ${title} at ${company}. We have opened the official employer portal in a new tab so you can complete your submission!`);
      } else {
        alert(`🎉 ${res.data?.message || `Application for ${title} at ${company} submitted successfully with verified delivery confirmation!`}`);
      }
      await fetchExistingApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplyingKey(null);
    }
  };

  const handleExecuteAutoApply = async () => {
    if (!autoApplyConsent) {
      setAutoApplyError('You must check the authorization box to grant permission before running automated applications.');
      return;
    }

    setAutoApplying(true);
    setAutoApplyError(null);
    setAutoApplyResult(null);

    try {
      const res = await api.post('/applications/auto-apply/run', {
        consentGranted: true,
        minMatchScore: autoApplyMinScore,
        dailyLimit: autoApplyMaxApps,
      });

      if (res.data?.data) {
        setAutoApplyResult(res.data.data);
        await fetchExistingApplications();
      }
    } catch (err: any) {
      setAutoApplyError(err.response?.data?.message || err.message || 'Auto-apply scan failed.');
    } finally {
      setAutoApplying(false);
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
      if (deviceLat === null || deviceLng === null) {
        return true;
      }
      const dist = locationMode === 'gps'
        ? calculateDistance(deviceLat, deviceLng, job.lat, job.lng)
        : (userLat !== null && userLng !== null
            ? (job.distanceMiles ?? calculateDistance(userLat, userLng, job.lat, job.lng))
            : (job.distanceMiles ?? 0));
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

      {/* Auto-Apply Permission & Execution Modal */}
      {autoApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="max-w-lg w-full p-6 space-y-5 bg-white border-neutral-300 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-neutral-900 text-white">
                  <Zap className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    AI Automated Job Applications
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    With Explicit User Permission &amp; Skill Threshold Matching
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAutoApplyModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error or Success Alert */}
            {autoApplyError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{autoApplyError}</span>
              </div>
            )}

            {autoApplyResult && (
              <div className="space-y-3">
                {autoApplyResult.submittedApplications && autoApplyResult.submittedApplications.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{autoApplyResult.submittedCount} Application(s) Confirmed & Submitted Directly:</span>
                    </div>
                    <div className="space-y-1.5 pl-6 pt-1 text-[11px] text-emerald-800">
                      {autoApplyResult.submittedApplications.map((app: any) => (
                        <div key={app._id} className="flex justify-between items-center bg-white/70 px-2 py-1.5 rounded border border-emerald-200/60">
                          <span>• {app.jobTitle} at <strong>{app.companyName}</strong></span>
                          <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {app.confirmationDetails?.confirmationId || 'Confirmed ✓'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {autoApplyResult.manualReviewApplications && autoApplyResult.manualReviewApplications.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>{autoApplyResult.requiresManualCount} Role(s) Require Direct Employer Portal Application:</span>
                    </div>
                    <p className="text-[11px] text-amber-800 pl-6">
                      These employers require direct submission through their official career portals. Application trackers have been initialized:
                    </p>
                    <div className="space-y-1.5 pl-6 pt-1 text-[11px] text-amber-800">
                      {autoApplyResult.manualReviewApplications.map((app: any) => (
                        <div key={app._id} className="flex justify-between items-center bg-white/70 px-2 py-1.5 rounded border border-amber-200/60">
                          <span>• {app.jobTitle} at <strong>{app.companyName}</strong></span>
                          {app.destinationUrl ? (
                            <a
                              href={app.destinationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-[10px] text-blue-700 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                            >
                              Apply on Portal ↗
                            </a>
                          ) : (
                            <span className="font-semibold text-amber-800">Manual Portal</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Consent & Legal Authorization (Mandatory) */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApplyConsent}
                  onChange={(e) => {
                    setAutoApplyConsent(e.target.checked);
                    if (e.target.checked) setAutoApplyError(null);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-neutral-900 focus:ring-0 border-neutral-300"
                />
                <div className="text-xs text-neutral-800">
                  <span className="font-bold">Grant Explicit Permission: </span>
                  I authorize RecruitX to automatically submit job applications matching my profile qualifications.
                </div>
              </label>

              <p className="text-[10.5px] text-neutral-500 pl-6 leading-relaxed">
                As required by the RecruitX Placement Protocol, automated applications are only dispatched with your active consent. Each submission is logged in your Applications Tracker with your uploaded resume.
              </p>
            </div>

            {/* Threshold & Preference Configuration */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-neutral-700 font-semibold mb-1">
                  <span>Minimum Match Percentage Threshold:</span>
                  <span className="font-bold text-neutral-900">{autoApplyMinScore}% Match</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="95"
                  step="5"
                  value={autoApplyMinScore}
                  onChange={(e) => setAutoApplyMinScore(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                  <span>60% (Broad)</span>
                  <span>75% (Recommended)</span>
                  <span>95% (Exact)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Max Applications Per Batch:</label>
                  <select
                    value={autoApplyMaxApps}
                    onChange={(e) => setAutoApplyMaxApps(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-neutral-300 bg-white"
                  >
                    <option value="3">Up to 3 Jobs</option>
                    <option value="5">Up to 5 Jobs (Recommended)</option>
                    <option value="10">Up to 10 Jobs</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Target Discipline:</label>
                  <input
                    type="text"
                    disabled
                    value={targetDomain}
                    className="w-full text-xs p-2 rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-600 truncate"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAutoApplyModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>

              <Button
                size="sm"
                onClick={handleExecuteAutoApply}
                disabled={!autoApplyConsent || autoApplying}
                className="text-xs gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-50"
              >
                {autoApplying ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Matching &amp; Applying...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Run Auto-Apply Scan Now</span>
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
            <h1 className="text-xl font-bold text-neutral-900">Job Matches & Company Openings</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white flex items-center gap-1">
              🇮🇳 India
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Openings near <span className="font-semibold text-neutral-900">{userCity}</span> for:{' '}
            <span className="font-semibold text-neutral-900">{targetDomain}</span>
          </p>
        </div>

        {/* Auto-Apply Action Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAutoApplyModalOpen(true);
              setAutoApplyResult(null);
              setAutoApplyError(null);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-neutral-200" />
            <span>Auto-Apply Engine</span>
          </button>
        </div>
      </div>

      {/* Location Permission Banner */}
      {gpsPermissionState !== 'granted' && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-neutral-200 text-neutral-700 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900">Set Your Location for Nearby Results</h3>
              <p className="text-[11.5px] text-neutral-500 mt-0.5">
                {gpsPermissionState === 'denied'
                  ? 'Location access was blocked. Use the search box below to manually set your city.'
                  : 'Allow browser location access to show jobs closest to you, or manually search your city below.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => detectLocationAndFetch(true)}
              disabled={locatingGps}
              size="sm"
              variant="outline"
              className="text-xs flex items-center gap-1.5"
            >
              {locatingGps ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  Use My Location
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Location & Distance Toolbar */}
      <div className="p-3.5 bg-neutral-50 text-neutral-900 rounded-xl border border-neutral-200 space-y-3">
        {/* Row 1: Origin display, GPS trigger, and Radius filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin className="w-4 h-4 text-neutral-500 shrink-0" />
            <span className="text-neutral-600 font-medium">Search Center:</span>
            <span className="font-bold text-neutral-900 bg-white px-2.5 py-1 rounded border border-neutral-200 flex items-center gap-1.5">
              {userCity}
              {deviceLat !== null && deviceLng !== null && (
                <span className="text-[10px] text-neutral-400 font-normal">
                  ({deviceLat.toFixed(3)}°N, {deviceLng.toFixed(3)}°E)
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => detectLocationAndFetch(true)}
              disabled={locatingGps}
              className="text-[11px] py-1 px-3 rounded-md font-semibold transition-all flex items-center gap-1.5 border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
            >
              {locatingGps ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Detecting...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span>Detect My Location</span>
                </>
              )}
            </button>
          </div>

          {filterMode === 'nearby' && (
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-neutral-500">Radius:</span>
              <div className="flex items-center gap-1">
                {[15, 25, 50, 100].map((r) => (
                  <button
                    key={r}
                    onClick={() => setNearbyRadius(r)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                      nearbyRadius === r
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    &lt; {r} km
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Locality Search Bar */}
        <div className="relative pt-1 border-t border-neutral-200">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-neutral-300 focus-within:border-neutral-900 transition-colors">
            <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <input
              type="text"
              placeholder="Search any city or area in India (e.g. Borivali, Whitefield, Hinjewadi, Sector 62...)"
              value={localitySearchText}
              onChange={(e) => {
                setLocalitySearchText(e.target.value);
                setIsLocalitySearchOpen(true);
              }}
              onFocus={() => setIsLocalitySearchOpen(true)}
              className="bg-transparent text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none w-full"
            />
            {localitySearchText && (
              <button
                type="button"
                onClick={() => {
                  setLocalitySearchText('');
                  setIsLocalitySearchOpen(false);
                }}
                className="text-neutral-400 hover:text-neutral-700 text-xs px-1"
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
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-neutral-100">
                  {filteredLocalities.map((loc) => (
                    <button
                      key={`${loc.name}-${loc.city}-${loc.lat}`}
                      type="button"
                      onClick={() => handleSelectLocality(loc)}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-neutral-900">
                            {loc.name}
                          </span>
                          <span className="text-[10px] text-neutral-500 ml-2">
                            ({loc.city}, {loc.state})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                          {loc.categoryLabel}
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
            Loading job openings...
          </p>
        </div>
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
            const distFromDevice = (deviceLat !== null && deviceLng !== null)
              ? Math.round(calculateDistance(deviceLat, deviceLng, job.lat, job.lng))
              : null;
            const isNearby = locationMode === 'gps'
              ? (distFromDevice !== null ? distFromDevice <= nearbyRadius : true)
              : distFromActiveCenter <= nearbyRadius;
            const isDifferentFromDevice = (userLat !== null && userLng !== null && deviceLat !== null && deviceLng !== null)
              ? calculateDistance(userLat, userLng, deviceLat, deviceLng) > 3
              : false;

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
                        {job.isPlatformJob ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Platform Verified Recruiter
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" /> LinkedIn Live Verified (Active & Hiring)
                          </span>
                        )}
                        {isNearby && distFromDevice !== null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> Nearby (&lt;{nearbyRadius} km)
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs">
                        <span className="font-bold text-neutral-900">{decodeHtmlEntities(job.company)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold text-neutral-700">
                          <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                          {distFromDevice !== null && distFromDevice <= 1
                            ? 'Within 1 km of your location'
                            : distFromDevice !== null && distFromDevice > 1
                            ? `${distFromDevice} km from your location`
                            : distFromActiveCenter > 0
                            ? (distFromActiveCenter <= 2
                                ? `Within ${userCity.split(',')[0]} center`
                                : `${distFromActiveCenter} km from ${userCity.split(',')[0]}`)
                            : ''}
                          <span className="text-neutral-500 font-normal">({job.location})</span>
                        </span>

                        {locationMode === 'metro' && isDifferentFromDevice && distFromDevice !== null && (
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

                {/* Middle Row: Per-Company Matching and Missing Skills */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                    {/* Matching Skills Candidate Possesses */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-neutral-800" />
                        <span>Matching Skills You Possess ({job.matchedSkills.length})</span>
                      </div>
                      {job.matchedSkills.length === 0 ? (
                        <p className="text-[11px] text-neutral-400 italic">No matching skills found in your profile.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {job.matchedSkills.map((sk) => (
                            <span
                              key={sk}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-200 text-neutral-800 border border-neutral-300"
                            >
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Missing Skills Required by This Specific Company */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Missing Skills for {decodeHtmlEntities(job.company)} ({job.missingSkills.length})</span>
                      </div>
                      {job.missingSkills.length === 0 ? (
                        <p className="text-[11px] text-neutral-700 font-semibold pt-1">
                          ✓ You meet 100% of requirements for this role!
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {job.missingSkills.map((sk) => (
                            <span
                              key={sk}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200"
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
                    {job.hrEmail ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 font-semibold text-[11px]">
                        <Mail className="w-3 h-3 text-indigo-700" />
                        <span>Method: Verified Email Application (Connected Gmail/Outlook)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 font-semibold text-[11px]">
                        <Globe className="w-3 h-3 text-neutral-600" />
                        <span>Method: Official Career Portal / ATS Submission</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {job.jobUrl && !job.isPlatformJob && (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
                      >
                        Portal Link ↗
                      </a>
                    )}
                    {(() => {
                      const cleanComp = decodeHtmlEntities(job.company).toLowerCase().trim();
                      const cleanTit = decodeHtmlEntities(job.title).toLowerCase().trim();
                      const existingApp = existingAppsMap[`${cleanComp}-${cleanTit}`] || existingAppsMap[companyKey];
                      const appStatus = existingApp?.authoritativeStatus || existingApp?.status;

                      if (existingApp && appStatus === 'external_application_required') {
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-amber-50 text-amber-900 border-amber-300 flex items-center gap-1">
                              <span>⚠️</span> Action Required
                            </span>
                            <a
                              href={job.jobUrl || existingApp.destinationUrl || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.title + ' ' + job.company)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors shadow-xs"
                            >
                              Complete on Portal <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        );
                      }

                      if (existingApp && (appStatus === 'email_sent' || appStatus === 'email_delivered')) {
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-indigo-50 text-indigo-900 border-indigo-300 flex items-center gap-1 font-bold">
                              <span>✉️</span> Email Sent
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate('/student/applications')}
                              className="text-xs text-indigo-800 border-indigo-300 bg-indigo-50"
                            >
                              View in Tracker
                            </Button>
                          </div>
                        );
                      }

                      if (existingApp && appStatus === 'awaiting_employer_verification') {
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-sky-50 text-sky-900 border-sky-300 flex items-center gap-1">
                              <span>⏳</span> Awaiting Response
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate('/student/applications')}
                              className="text-xs"
                            >
                              View in Tracker
                            </Button>
                          </div>
                        );
                      }

                      if (existingApp && appStatus === 'employer_receipt_confirmed') {
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-emerald-50 text-emerald-900 border-emerald-300 flex items-center gap-1 font-bold">
                              <span>✓</span> Employer Confirmed
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate('/student/applications')}
                              className="text-xs text-emerald-800 border-emerald-300 bg-emerald-50"
                            >
                              View in Tracker
                            </Button>
                          </div>
                        );
                      }

                      if (existingApp && appStatus === 'employer_status_updated') {
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-purple-50 text-purple-900 border-purple-300 flex items-center gap-1">
                              <span>⚡</span> {(existingApp.hiringStage || existingApp.status || '').replace('_', ' ').toUpperCase()}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate('/student/applications')}
                              className="text-xs text-purple-800 border-purple-300 bg-purple-50"
                            >
                              Pipeline View
                            </Button>
                          </div>
                        );
                      }

                      return (
                        <Button
                          onClick={() => handleNativeApply(job.company, job.title, job.hrEmail, job.jobUrl, job.isPlatformJob)}
                          disabled={isApplied || isApplying}
                          size="sm"
                          className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold shadow-xs text-xs"
                          variant={isApplied ? 'secondary' : 'primary'}
                        >
                          {isApplied ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-600" />
                              Tracked in Applications
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 text-amber-300" />
                              {isApplying ? 'Applying Automatically...' : 'Apply Automatically'}
                            </>
                          )}
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
