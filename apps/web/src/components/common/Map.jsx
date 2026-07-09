// src/components/Map.jsx
/* global google */
import { Search } from "lucide-react";
import { useEffect, useRef, useCallback, useState } from "react";

const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 };

export default function Map({
  onLocationSelect,
  initialCenter = DEFAULT_CENTER,
  initialZoom = 12
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const searchRequestIdRef = useRef(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [placesLibrary, setPlacesLibrary] = useState(null);

  const geocodeLocation = useCallback(async (latLng) => {
    return new Promise((resolve) => {
      if (!window.google) {
        resolve({
          lat: latLng.lat,
          lng: latLng.lng,
          address: `Location (${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)})`,
          name: `Location (${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)})`,
        });
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === "OK" && results[0]) {
          resolve({
            lat: latLng.lat,
            lng: latLng.lng,
            address: results[0].formatted_address,
            name: results[0].formatted_address,
          });
        } else {
          resolve({
            lat: latLng.lat,
            lng: latLng.lng,
            address: `Location (${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)})`,
            name: `Location (${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)})`,
          });
        }
      });
    });
  }, []);

  const handleLocationSelect = useCallback((place) => {
    onLocationSelect(place);
  }, [onLocationSelect]);

  // Load the places library once
  useEffect(() => {
    if (!window.google) return;
    google.maps.importLibrary("places").then(({ AutocompleteSuggestion }) => {
      setPlacesLibrary({ AutocompleteSuggestion });
    });
  }, []);

  // Init map + click-to-select (unrelated to search, unchanged)
  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current || !window.google || mapInstanceRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: initialZoom,
      });

      mapInstanceRef.current = map;

      map.addListener("click", async (e) => {
        const clickedLocation = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        const place = await geocodeLocation(clickedLocation);
        handleLocationSelect(place);

        if (markerRef.current) markerRef.current.setMap(null);
        markerRef.current = new window.google.maps.Marker({
          position: clickedLocation,
          map,
          title: "Selected Location",
        });
      });
    };

    if (window.google && mapRef.current) {
      initializeMap();
      return;
    }

    const interval = setInterval(() => {
      if (window.google && mapRef.current) {
        clearInterval(interval);
        initializeMap();
      }
    }, 100);

    return () => clearInterval(interval);
    // no more initialCenter/initialZoom in deps — map should init once, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocodeLocation, handleLocationSelect]);

  const getSessionToken = () => {
    if (!sessionTokenRef.current && window.google) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  };

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchTerm(query);

    if (!query || query.length < 2 || !placesLibrary) {
      setPredictions([]);
      return;
    }

    const requestId = ++searchRequestIdRef.current;

    try {
      const { suggestions } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        locationBias: { radius: 50000, center: initialCenter },
        includedRegionCodes: ['ng'],
        sessionToken: getSessionToken(),
      });

      if (requestId !== searchRequestIdRef.current) return;

      setPredictions((suggestions || []).map((s) => ({
        placePrediction: s.placePrediction,
        description: s.placePrediction.text.text,
      })));
    } catch (err) {
      console.error("Map search failed:", err);
      setPredictions([]);
    }
  };

  const handlePredictionSelect = async (prediction) => {
    setPredictions([]);
    setSearchTerm(prediction.description);

    const place = prediction.placePrediction.toPlace();
    const result = await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] });

    const lat = result.place.location.lat();
    const lng = result.place.location.lng();

    sessionTokenRef.current = null; // session terminated

    const selectedPlace = {
      name: result.place.displayName,
      address: result.place.formattedAddress,
      lat,
      lng,
    };

    handleLocationSelect(selectedPlace);

    const map = mapInstanceRef.current;
    if (map) {
      map.setCenter({ lat, lng });
      map.setZoom(16);
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        title: result.place.displayName,
      });
    }
  };

  return (
    <>
      <div className="p-4 bg-inherit border-b relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id="map-search"
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search for a location..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300/60 dark:border-gray-600/60 rounded-lg bg-inherit text-black dark:text-white"
          />
        </div>

        {predictions.length > 0 && (
          <div className="absolute left-4 right-4 mt-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
            {predictions.map((p) => (
              <button
                key={p.placePrediction.placeId}
                onClick={() => handlePredictionSelect(p)}
                className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-0"
              >
                {p.description}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={mapRef} className="flex-1 h-full w-full" />
    </>
  );
}