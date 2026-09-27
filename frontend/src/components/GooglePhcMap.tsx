import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  MapPin, Search, Maximize2, RefreshCw, X
} from 'lucide-react';
import { PhcRecord } from '../types';
import { api } from '../services/api';
import { 
  getGoogleMapsApiKey, loadGoogleMaps, subscribeToKeyChanges 
} from '../services/googleMapsLoader';

interface Props {
  phcs?: PhcRecord[];
  selectedPhcId?: string;
  onSelectPhc?: (phcId: string) => void;
  selectedStateId?: string;
  selectedDistrictId?: string;
  height?: string;
  title?: string;
  subtitle?: string;
  showFilters?: boolean;
}

type RiskFilter = 'ALL' | 'CRITICAL' | 'WATCH' | 'OPTIMAL';
type MapTypeId = 'roadmap' | 'satellite' | 'terrain' | 'hybrid';

export const GooglePhcMap: React.FC<Props> = ({
  phcs: propPhcs,
  selectedPhcId,
  onSelectPhc,
  selectedStateId,
  selectedDistrictId,
  height = '560px',
  title = 'Public Health Facility Network',
  subtitle = 'Live Google Maps telemetry across primary health centres with GPS-calibrated supply risk monitoring',
  showFilters = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const [allPhcs, setAllPhcs] = useState<PhcRecord[]>(propPhcs || []);
  const [loadingPhcs, setLoadingPhcs] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Filter & Search states
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMapType, setActiveMapType] = useState<MapTypeId>('roadmap');

  // In-code API key
  const [apiKey, setApiKey] = useState(getGoogleMapsApiKey());

  // 1. Fetch PHCs if not provided as props
  useEffect(() => {
    if (propPhcs && propPhcs.length > 0) {
      setAllPhcs(propPhcs);
      return;
    }

    const fetchPhcs = async () => {
      setLoadingPhcs(true);
      try {
        const data = await api.getPhcs(selectedStateId, selectedDistrictId);
        setAllPhcs(data);
      } catch (err) {
        console.error('Failed to load PHCs for map:', err);
      } finally {
        setLoadingPhcs(false);
      }
    };

    fetchPhcs();
  }, [propPhcs, selectedStateId, selectedDistrictId]);

  // 2. Listen to any in-code or runtime key updates
  useEffect(() => {
    const unsubscribe = subscribeToKeyChanges((newKey) => {
      setApiKey(newKey);
      setMapError(null);
    });
    return unsubscribe;
  }, []);

  // 3. Initialize Google Maps using the in-code API key
  const initMap = useCallback(async () => {
    const key = getGoogleMapsApiKey();
    if (!key) {
      setMapError('NO_KEY');
      setMapsLoaded(false);
      return;
    }

    try {
      setMapError(null);
      await loadGoogleMaps(key);

      if (!mapContainerRef.current) return;

      // Default center: Geographic center of India
      const defaultCenter = { lat: 21.7679, lng: 78.8718 };

      const map = new (window as any).google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 5,
        mapTypeId: activeMapType,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        scrollwheel: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#007AFF' }, { weight: 1.5 }] },
        ],
      });

      infoWindowRef.current = new (window as any).google.maps.InfoWindow();
      mapInstanceRef.current = map;
      setMapsLoaded(true);
    } catch (err: any) {
      console.warn('Google Maps Initialization notice:', err);
      setMapError(err?.message || 'LOAD_ERROR');
      setMapsLoaded(false);
    }
  }, [activeMapType]);

  useEffect(() => {
    initMap();
  }, [initMap, apiKey]);

  // 4. Update Map Type
  const handleMapTypeChange = (type: MapTypeId) => {
    setActiveMapType(type);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(type);
    }
  };

  // 5. Filter PHCs
  const filteredPhcs = useMemo(() => {
    return allPhcs.filter((phc) => {
      const phcStatus = phc.status || (phc.critical_risks_count && phc.critical_risks_count > 0 ? 'CRITICAL' : 'OPTIMAL');
      if (riskFilter !== 'ALL' && phcStatus !== riskFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = phc.phc_name.toLowerCase().includes(q);
        const matchesId = phc.phc_id.toLowerCase().includes(q);
        const matchesDistrict = (phc.district_name || phc.district_id || '').toLowerCase().includes(q);
        const matchesState = (phc.state_name || phc.state_id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesDistrict && !matchesState) {
          return false;
        }
      }

      return true;
    });
  }, [allPhcs, riskFilter, searchQuery]);

  // Status summaries
  const criticalCount = useMemo(() => allPhcs.filter(p => p.status === 'CRITICAL' || (p.critical_risks_count && p.critical_risks_count > 0)).length, [allPhcs]);
  const watchCount = useMemo(() => allPhcs.filter(p => p.status === 'WATCH').length, [allPhcs]);
  const optimalCount = useMemo(() => allPhcs.filter(p => p.status === 'OPTIMAL' || (!p.status && !p.critical_risks_count)).length, [allPhcs]);

  // Helper to create custom SVG pins
  const createPinIcon = (status: 'CRITICAL' | 'WATCH' | 'OPTIMAL', isSelected: boolean) => {
    const color = status === 'CRITICAL' ? '#FF3B30' : status === 'WATCH' ? '#FF9500' : '#007AFF';
    const scale = isSelected ? 1.3 : 1.0;
    const size = Math.round(28 * scale);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 28 36">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
          </filter>
        </defs>
        <g filter="url(#shadow)">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.732-6.268-14-14-14z" fill="${color}"/>
          <circle cx="14" cy="13" r="6.5" fill="#FFFFFF"/>
          <circle cx="14" cy="13" r="3.5" fill="${color}"/>
        </g>
      </svg>
    `;

    const gmaps = (window as any).google?.maps;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: gmaps ? new gmaps.Size(size, size + 8) : undefined,
      anchor: gmaps ? new gmaps.Point(size / 2, size + 8) : undefined,
    };
  };

  // 6. Render markers onto Google Map
  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current) return;

    const gmaps = (window as any).google?.maps;
    if (!gmaps) return;

    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (filteredPhcs.length === 0) return;

    const bounds = new gmaps.LatLngBounds();
    let hasValidCoords = false;

    filteredPhcs.forEach((phc) => {
      if (!phc.latitude || !phc.longitude) return;

      const position = { lat: phc.latitude, lng: phc.longitude };
      bounds.extend(position);
      hasValidCoords = true;

      const phcStatus: 'CRITICAL' | 'WATCH' | 'OPTIMAL' = 
        phc.status || (phc.critical_risks_count && phc.critical_risks_count > 0 ? 'CRITICAL' : 'OPTIMAL');

      const isSelected = selectedPhcId === phc.phc_id;

      const marker = new gmaps.Marker({
        position,
        map,
        title: phc.phc_name,
        icon: createPinIcon(phcStatus, isSelected),
        zIndex: isSelected ? 999 : phcStatus === 'CRITICAL' ? 100 : 10,
        animation: isSelected ? gmaps.Animation.BOUNCE : undefined,
      });

      marker.addListener('click', () => {
        if (!infoWindow) return;

        const statusBadgeBg = phcStatus === 'CRITICAL' ? '#FFEAEA' : phcStatus === 'WATCH' ? '#FFF5E5' : '#EAF8EE';
        const statusBadgeColor = phcStatus === 'CRITICAL' ? '#FF3B30' : phcStatus === 'WATCH' ? '#FF9500' : '#34C759';

        const contentString = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px 4px; min-width: 250px; max-width: 290px;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; border-bottom: 1px solid #ECECEE; padding-bottom: 8px; margin-bottom: 8px;">
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #1D1D1F; line-height: 1.2;">${phc.phc_name}</div>
                <div style="font-family: monospace; font-size: 10px; color: #86868B; margin-top: 3px;">${phc.phc_id}</div>
              </div>
              <span style="background: ${statusBadgeBg}; color: ${statusBadgeColor}; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; text-transform: uppercase; white-space: nowrap;">
                ${phcStatus}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; margin-bottom: 10px;">
              <div style="background: #F5F5F7; padding: 6px 8px; border-radius: 8px;">
                <span style="font-size: 9px; text-transform: uppercase; color: #86868B; font-weight: 600; display: block;">District / State</span>
                <span style="font-weight: 600; color: #1D1D1F; margin-top: 2px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${phc.district_name || phc.district_id}, ${phc.state_name || phc.state_id}
                </span>
              </div>
              <div style="background: #F5F5F7; padding: 6px 8px; border-radius: 8px;">
                <span style="font-size: 9px; text-transform: uppercase; color: #86868B; font-weight: 600; display: block;">Population</span>
                <span style="font-family: monospace; font-weight: 700; color: #1D1D1F; margin-top: 2px; display: block;">
                  ${(phc.population_served || 0).toLocaleString()}
                </span>
              </div>
              <div style="background: #F5F5F7; padding: 6px 8px; border-radius: 8px;">
                <span style="font-size: 9px; text-transform: uppercase; color: #86868B; font-weight: 600; display: block;">Bed Capacity</span>
                <span style="font-family: monospace; font-weight: 700; color: #007AFF; margin-top: 2px; display: block;">
                  ${phc.bed_capacity || 'N/A'} Beds
                </span>
              </div>
              <div style="background: #F5F5F7; padding: 6px 8px; border-radius: 8px;">
                <span style="font-size: 9px; text-transform: uppercase; color: #86868B; font-weight: 600; display: block;">GPS Location</span>
                <span style="font-family: monospace; font-size: 10px; color: #1D1D1F; margin-top: 2px; display: block;">
                  ${phc.latitude.toFixed(2)}°N, ${phc.longitude.toFixed(2)}°E
                </span>
              </div>
            </div>

            <button 
              id="btn-inspect-phc" 
              style="width: 100%; background: #007AFF; color: #FFFFFF; font-size: 11px; font-weight: 600; padding: 7px 12px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
            >
              <span>View Facility Dashboard</span>
              <span>&rarr;</span>
            </button>
          </div>
        `;

        infoWindow.setContent(contentString);
        infoWindow.open(map, marker);

        gmaps.event.addListenerOnce(infoWindow, 'domready', () => {
          const btn = document.getElementById('btn-inspect-phc');
          if (btn) {
            btn.onclick = () => {
              if (onSelectPhc) {
                onSelectPhc(phc.phc_id);
              }
            };
          }
        });
      });

      markersRef.current.push(marker);

      if (isSelected && infoWindow) {
        gmaps.event.trigger(marker, 'click');
      }
    });

    if (hasValidCoords) {
      if (filteredPhcs.length === 1) {
        map.setCenter({ lat: filteredPhcs[0].latitude, lng: filteredPhcs[0].longitude });
        map.setZoom(12);
      } else {
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      }
    }
  }, [mapsLoaded, filteredPhcs, selectedPhcId, onSelectPhc]);

  // Fit bounds helper
  const handleResetBounds = () => {
    const gmaps = (window as any).google?.maps;
    if (!mapInstanceRef.current || !gmaps || filteredPhcs.length === 0) return;
    const bounds = new gmaps.LatLngBounds();
    filteredPhcs.forEach((p) => {
      if (p.latitude && p.longitude) {
        bounds.extend({ lat: p.latitude, lng: p.longitude });
      }
    });
    mapInstanceRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-black/4 flex flex-col space-y-5">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF] animate-ping" />
            <span className="text-xs font-semibold uppercase tracking-wider text-black/40">
              Google Maps Telemetry
            </span>
            <span className="bg-[#E5F1FF] text-[#007AFF] text-[10px] font-bold px-2 py-0.5 rounded-full">
              {filteredPhcs.length} / {allPhcs.length} Facilities
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mt-1">{title}</h2>
          <p className="text-xs text-black/50 mt-0.5 max-w-2xl">{subtitle}</p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Map Layer Mode */}
          <div className="flex items-center bg-[#F5F5F7] p-0.5 rounded-xl border border-black/4 text-xs font-medium">
            <button
              onClick={() => handleMapTypeChange('roadmap')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeMapType === 'roadmap' ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold' : 'text-black/50 hover:text-black'
              }`}
            >
              Roadmap
            </button>
            <button
              onClick={() => handleMapTypeChange('satellite')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeMapType === 'satellite' ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold' : 'text-black/50 hover:text-black'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => handleMapTypeChange('terrain')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeMapType === 'terrain' ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold' : 'text-black/50 hover:text-black'
              }`}
            >
              Terrain
            </button>
          </div>

          {/* Reset Zoom */}
          <button
            onClick={handleResetBounds}
            title="Reset Zoom to Fit All PHCs"
            className="p-2 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBEF] text-black/60 hover:text-black border border-black/4 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Interactive Filter Bar */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-black/4">
          {/* Risk Filter Pills with mouse wheel horizontal scroll */}
          <div 
            onWheel={(e) => {
              if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
            }}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
          >
            <button
              onClick={() => setRiskFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                riskFilter === 'ALL'
                  ? 'bg-[#1D1D1F] text-white shadow-xs'
                  : 'bg-[#F5F5F7] text-black/60 hover:text-black'
              }`}
            >
              All Statuses ({allPhcs.length})
            </button>
            <button
              onClick={() => setRiskFilter('CRITICAL')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                riskFilter === 'CRITICAL'
                  ? 'bg-[#FF3B30] text-white shadow-xs'
                  : 'bg-[#FFEAEA] text-[#FF3B30] hover:bg-[#FFD9D9]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>Critical Risk ({criticalCount})</span>
            </button>
            <button
              onClick={() => setRiskFilter('WATCH')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                riskFilter === 'WATCH'
                  ? 'bg-[#FF9500] text-white shadow-xs'
                  : 'bg-[#FFF5E5] text-[#FF9500] hover:bg-[#FFE8CC]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>Watch ({watchCount})</span>
            </button>
            <button
              onClick={() => setRiskFilter('OPTIMAL')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                riskFilter === 'OPTIMAL'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'bg-[#EAF8EE] text-[#34C759] hover:bg-[#D5F2DC]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>Optimal ({optimalCount})</span>
            </button>
          </div>

          {/* Quick Facility Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Search PHC, district, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs pl-8 pr-3 py-1.5 rounded-xl border border-black/4 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all placeholder:text-black/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Main Map Canvas Container */}
      <div 
        className="relative w-full rounded-2xl overflow-hidden border border-black/6 bg-[#F8F8FA] shadow-inner"
        style={{ height }}
      >
        {/* Real Google Map Container (shows when loaded) */}
        <div 
          ref={mapContainerRef} 
          className={`w-full h-full ${mapsLoaded ? 'block' : 'hidden'}`} 
        />

        {/* Loading Indicator */}
        {loadingPhcs && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md text-xs font-medium text-[#1D1D1F]">
              <RefreshCw className="w-4 h-4 animate-spin text-[#007AFF]" />
              <span>Synchronizing PHC Coordinates...</span>
            </div>
          </div>
        )}

        {/* Seamless Interactive Facilities Map Canvas (shown while key initializes or if key unset) */}
        {!mapsLoaded && (
          <div className="absolute inset-0 bg-[#F9F9FB] flex flex-col justify-between p-6">
            <div className="flex items-center justify-between text-xs text-black/60 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-black/4 shadow-xs z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse" />
                <span className="font-semibold text-[#1D1D1F]">Interactive Geospatial Facility Grid</span>
                <span className="text-black/40">({filteredPhcs.length} PHCs plotted by GPS coordinates)</span>
              </div>
            </div>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <svg viewBox="68 8 30 28" className="w-full h-full max-h-[480px]">
                {/* Background India boundary box representation */}
                <rect x="68" y="8" width="30" height="28" fill="#F0F0F4" rx="2" />
                {filteredPhcs.map((phc) => {
                  const isCrit = phc.status === 'CRITICAL' || (phc.critical_risks_count && phc.critical_risks_count > 0);
                  const isWatch = phc.status === 'WATCH';
                  const color = isCrit ? '#FF3B30' : isWatch ? '#FF9500' : '#007AFF';
                  const svgY = 36 - phc.latitude;
                  const svgX = phc.longitude;

                  return (
                    <circle
                      key={phc.phc_id}
                      cx={svgX}
                      cy={svgY}
                      r={isCrit ? "0.6" : "0.45"}
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth="0.1"
                      className="cursor-pointer hover:r-[0.9] transition-all"
                      onClick={() => onSelectPhc && onSelectPhc(phc.phc_id)}
                    >
                      <title>{`${phc.phc_name} (${phc.status || 'NORMAL'})`}</title>
                    </circle>
                  );
                })}
              </svg>
            </div>

            <div className="text-center text-[11px] text-black/40">
              {apiKey 
                ? 'Connecting to Google Maps Satellite & Terrain tiles...'
                : 'Displaying facilities from verified GPS coordinates. Add your key to mapsKey.ts or .env for live Google Maps tiles.'}
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer Telemetry Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-black/50 pt-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
            <span>Optimal</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500]" />
            <span>Watch</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30] animate-pulse" />
            <span>Critical Alert</span>
          </span>
        </div>
        <div className="text-black/40 font-mono text-[11px]">
          Click any facility pin to inspect inventory depletion, beds, and staff
        </div>
      </div>
    </div>
  );
};
