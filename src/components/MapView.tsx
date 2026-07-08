"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { SmokeMarker } from "@/types";
import "leaflet/dist/leaflet.css";

const ZONE_RADIUS_BASE = 75; // metre (yakin zoom)

function getZoneRadius(zoom: number): number {
  if (zoom >= 16) return ZONE_RADIUS_BASE;
  if (zoom >= 14) return 150;
  if (zoom >= 12) return 400;
  if (zoom >= 10) return 1200;
  return 3000;
}

function createSmokeIcon(teamColor?: string | null) {
  const color = teamColor || "#f97316";
  return new L.DivIcon({
    html: `<div style="font-size: 24px; text-align: center; line-height: 1; background: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🚬</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    className: "",
  });
}

const pendingIcon = new L.DivIcon({
  html: `<div style="font-size: 32px; text-align: center; line-height: 1; opacity: 0.7;">📍</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: "",
});

interface ZoneData {
  lat: number;
  lng: number;
  color: string;
  teamName: string;
  lastUser: string;
}

function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function computeZones(markers: SmokeMarker[]): ZoneData[] {
  const zones: ZoneData[] = [];

  const sorted = [...markers].sort(
    (a, b) => new Date(a.smoked_at).getTime() - new Date(b.smoked_at).getTime()
  );

  for (const marker of sorted) {
    const teamColor = marker.teams?.color;
    if (!teamColor) continue;

    const existingZone = zones.find(
      (z) =>
        getDistance(z.lat, z.lng, marker.latitude, marker.longitude) <
        ZONE_RADIUS_BASE
    );

    if (existingZone) {
      existingZone.color = teamColor;
      existingZone.teamName = marker.teams?.name || "";
      existingZone.lastUser = marker.profiles?.display_name || "";
    } else {
      zones.push({
        lat: marker.latitude,
        lng: marker.longitude,
        color: teamColor,
        teamName: marker.teams?.name || "",
        lastUser: marker.profiles?.display_name || "",
      });
    }
  }

  return zones;
}

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, []);
  return null;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ActionButtons({
  pendingLocation,
  onGPS,
  onConfirm,
  onCancel,
  adding,
}: {
  pendingLocation: { lat: number; lng: number } | null;
  onGPS: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  adding: boolean;
}) {
  if (pendingLocation) {
    return (
      <div className="absolute bottom-6 left-4 right-4 z-[1000] flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-full shadow-lg active:scale-95 transition-all"
        >
          Iptal
        </button>
        <button
          onClick={onConfirm}
          disabled={adding}
          className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
          {adding ? "Ekleniyor..." : "Onayla"}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-4 right-4 z-[1000] flex gap-3">
      <button
        onClick={onGPS}
        disabled={adding}
        className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50"
      >
        {adding ? "Ekleniyor..." : "🚬 Konumuma Ekle"}
      </button>
    </div>
  );
}

function MapInteraction() {
  const map = useMap();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const { profile } = useAuth();

  const addMarker = useCallback(
    async (latitude: number, longitude: number) => {
      setAdding(true);
      const { error } = await supabase.from("smoke_markers").insert({
        user_id: user!.id,
        latitude,
        longitude,
        smoked_at: new Date().toISOString(),
        team_id: profile?.team_id || null,
      });

      if (error) {
        console.error("Marker eklenemedi:", error);
        alert("Marker eklenemedi: " + error.message);
      } else {
        await supabase.rpc("increment_smoke_count", { uid: user!.id });
        window.dispatchEvent(new Event("marker-added"));
      }
      setAdding(false);
      setPendingLocation(null);
    },
    [user, profile]
  );

  const handleGPS = () => {
    setAdding(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16);
        await addMarker(latitude, longitude);
      },
      () => {
        alert("Konum alinamadi. Konum izni verdiginizden emin olun.");
        setAdding(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleMapClick = (lat: number, lng: number) => {
    setPendingLocation({ lat, lng });
  };

  const handleConfirm = () => {
    if (pendingLocation) {
      addMarker(pendingLocation.lat, pendingLocation.lng);
    }
  };

  const handleCancel = () => {
    setPendingLocation(null);
  };

  return (
    <>
      <MapClickHandler onMapClick={handleMapClick} />

      {pendingLocation && (
        <Marker
          position={[pendingLocation.lat, pendingLocation.lng]}
          icon={pendingIcon}
        >
          <Popup>Buraya eklenecek</Popup>
        </Marker>
      )}

      <ActionButtons
        pendingLocation={pendingLocation}
        onGPS={handleGPS}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        adding={adding}
      />
    </>
  );
}

export default function MapView() {
  const [markers, setMarkers] = useState<SmokeMarker[]>([]);
  const [zoom, setZoom] = useState(12);
  const { user } = useAuth();

  const fetchMarkers = async () => {
    const { data, error } = await supabase
      .from("smoke_markers")
      .select("*, profiles(username, display_name, team_id), teams:team_id(*)")
      .order("smoked_at", { ascending: false })
      .limit(500);

    if (error) console.error("Markers fetch error:", error);
    if (data) setMarkers(data);
  };

  useEffect(() => {
    fetchMarkers();

    const handleAdded = () => fetchMarkers();
    window.addEventListener("marker-added", handleAdded);

    const channel = supabase
      .channel("markers")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "smoke_markers" },
        () => fetchMarkers()
      )
      .subscribe();

    return () => {
      window.removeEventListener("marker-added", handleAdded);
      supabase.removeChannel(channel);
    };
  }, []);

  const zones = useMemo(() => computeZones(markers), [markers]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[41.0082, 28.9784]}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomTracker onZoomChange={setZoom} />

        {/* Takım bölgeleri - yarıçap daireler */}
        {zones.map((zone, i) => (
          <Circle
            key={`zone-${i}-${zoom}`}
            center={[zone.lat, zone.lng]}
            radius={getZoneRadius(zoom)}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: 0.2,
              weight: 2,
              opacity: 0.6,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold" style={{ color: zone.color }}>
                  {zone.teamName}
                </p>
                <p className="text-xs text-slate-500">
                  Son icen: {zone.lastUser}
                </p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Sigara marker'ları */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={createSmokeIcon(marker.teams?.color)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">
                  {marker.profiles?.display_name || "Anonim"}
                </p>
                <p className="text-slate-500">
                  @{marker.profiles?.username || "?"}
                </p>
                {marker.teams && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: marker.teams.color }}
                  >
                    {marker.teams.name}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(marker.smoked_at).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(marker.smoked_at).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {user && <MapInteraction />}
      </MapContainer>

      {!user && (
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-white/90 backdrop-blur rounded-xl p-3 text-center text-sm text-slate-600 shadow">
          Sigara eklemek icin giris yap
        </div>
      )}
    </div>
  );
}
