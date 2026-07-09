"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import { compressImage } from "@/lib/compress-image";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { notifyZoneCapture } from "@/lib/notify-zone-capture";
import "leaflet/dist/leaflet.css";

const ZONE_RADIUS_BASE = 75;

function getZoneRadius(zoom: number): number {
  if (zoom >= 16) return ZONE_RADIUS_BASE;
  if (zoom >= 14) return 150;
  if (zoom >= 12) return 400;
  if (zoom >= 10) return 1200;
  return 3000;
}

function createSmokeIcon(teamColor?: string | null, hasPhoto?: boolean) {
  const color = teamColor || "#059669";
  const photoIndicator = hasPhoto
    ? `<div style="position:absolute;top:-2px;right:-2px;background:#fff;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-size:8px;box-shadow:0 1px 3px rgba(0,0,0,0.3);">📷</div>`
    : "";
  return new L.DivIcon({
    html: `<div style="position:relative;font-size: 24px; text-align: center; line-height: 1; background: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🚬${photoIndicator}</div>`,
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

function ZoomTracker({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) {
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

const userLocationIcon = new L.DivIcon({
  html: `<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #3b82f6, 0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: "",
});

function UserLocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true }
    );

    const flyHandler = (e: Event) => {
      const { lat, lng } = (e as CustomEvent).detail;
      map.flyTo([lat, lng], 16);
    };
    window.addEventListener("fly-to-location", flyHandler);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener("fly-to-location", flyHandler);
    };
  }, [map]);

  if (!position) return null;

  return (
    <>
      <Circle
        center={position}
        radius={30}
        pathOptions={{
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.1,
          weight: 1,
        }}
      />
      <Marker position={position} icon={userLocationIcon}>
        <Popup>Buradasin</Popup>
      </Marker>
    </>
  );
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

function PhotoModal({
  markerId,
  onDone,
}: {
  markerId: string;
  onDone: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const filePath = `markers/${markerId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressed, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        alert("Foto yuklenemedi: " + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      await supabase
        .from("smoke_markers")
        .update({ photo_url: urlData.publicUrl })
        .eq("id", markerId);

      window.dispatchEvent(new Event("marker-added"));
      onDone();
    } catch {
      alert("Bir hata olustu");
      setUploading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[2000] bg-black/50 flex items-end justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
        <p className="text-center font-semibold text-slate-800 mb-1">
          Sigara eklendi!
        </p>
        <p className="text-center text-sm text-slate-500 mb-4">
          Fotograf eklemek ister misin?
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />

        <div className="flex gap-3">
          <button
            onClick={onDone}
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl active:scale-95 transition-all"
          >
            Gec
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {uploading ? "Yukleniyor..." : "📷 Foto Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
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
      <div
        className="absolute bottom-6 left-4 right-4 z-[1000] flex gap-3"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-full shadow-lg active:scale-95 transition-all"
        >
          Iptal
        </button>
        <button
          onClick={onConfirm}
          disabled={adding}
          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-50"
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
        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50"
      >
        {adding ? "Ekleniyor..." : "🚬 Konumuma Ekle"}
      </button>
    </div>
  );
}

function MapInteraction({
  onMarkerAdded,
}: {
  onMarkerAdded: (id: string) => void;
}) {
  const map = useMap();
  const { user, profile } = useAuth();
  const [adding, setAdding] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const addMarker = useCallback(
    async (latitude: number, longitude: number) => {
      setAdding(true);
      const { data, error } = await supabase
        .from("smoke_markers")
        .insert({
          user_id: user!.id,
          latitude,
          longitude,
          smoked_at: new Date().toISOString(),
          team_id: profile?.team_id || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Marker eklenemedi:", error);
        alert("Marker eklenemedi: " + error.message);
      } else {
        await supabase.rpc("increment_smoke_count", { uid: user!.id });
        window.dispatchEvent(new Event("marker-added"));
        onMarkerAdded(data.id);
        checkAndUnlockAchievements(user!.id).then((newOnes) => {
          if (newOnes.length > 0) {
            window.dispatchEvent(
              new CustomEvent("achievement-unlocked", { detail: newOnes })
            );
          }
        });
        notifyZoneCapture(
          latitude,
          longitude,
          user!.id,
          profile?.team_id || null,
          profile?.teams?.name || null
        );
      }
      setAdding(false);
      setPendingLocation(null);
    },
    [user, profile, onMarkerAdded]
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
    if (pendingLocation) return;
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
  const [photoMarkerId, setPhotoMarkerId] = useState<string | null>(null);
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
        { event: "*", schema: "public", table: "smoke_markers" },
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
        <UserLocation />

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
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent);
              },
            }}
            interactive={false}
          />
        ))}

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={createSmokeIcon(marker.teams?.color, !!marker.photo_url)}
          >
            <Popup>
              <div className="text-sm max-w-[220px] max-h-[300px] overflow-y-auto">
                {(() => {
                  const nearby = markers.filter(
                    (m) =>
                      getDistance(
                        marker.latitude,
                        marker.longitude,
                        m.latitude,
                        m.longitude
                      ) < ZONE_RADIUS_BASE
                  ).sort(
                    (a, b) =>
                      new Date(b.smoked_at).getTime() -
                      new Date(a.smoked_at).getTime()
                  );
                  return (
                    <>
                      {nearby.length > 1 && (
                        <p className="text-xs text-slate-400 mb-2 font-medium">
                          Bu bolgede {nearby.length} sigara
                        </p>
                      )}
                      {nearby.map((m, idx) => (
                        <div
                          key={m.id}
                          className={
                            idx > 0
                              ? "border-t border-slate-100 pt-2 mt-2"
                              : ""
                          }
                        >
                          {m.photo_url && (
                            <img
                              src={m.photo_url}
                              alt="Sigara fotografi"
                              className="w-full h-24 object-cover rounded-lg mb-1"
                            />
                          )}
                          <div className="flex items-center justify-between">
                            <a
                              href={`/user/${m.user_id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/user/${m.user_id}`;
                              }}
                              style={{
                                color: "#047857",
                                fontWeight: 600,
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}
                            >
                              {m.profiles?.display_name || "Anonim"}
                            </a>
                            {m.user_id === user?.id && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm("Bu sigara silinsin mi?")) return;
                                  await supabase
                                    .from("smoke_markers")
                                    .delete()
                                    .eq("id", m.id);
                                  await supabase.rpc("decrement_smoke_count", { uid: user!.id });
                                  window.dispatchEvent(new Event("marker-added"));
                                }}
                                style={{
                                  color: "#ef4444",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  background: "none",
                                  border: "none",
                                  fontWeight: 500,
                                }}
                              >
                                Sil
                              </button>
                            )}
                          </div>
                          {m.teams && (
                            <span
                              className="text-xs"
                              style={{ color: m.teams.color }}
                            >
                              {m.teams.name}
                            </span>
                          )}
                          <p className="text-xs text-slate-400">
                            {new Date(m.smoked_at).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            {new Date(m.smoked_at).toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </Popup>
          </Marker>
        ))}

        {user && <MapInteraction onMarkerAdded={(id) => setPhotoMarkerId(id)} />}
      </MapContainer>

      {/* Konumuma git butonu */}
      <button
        onClick={() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              window.dispatchEvent(
                new CustomEvent("fly-to-location", {
                  detail: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                })
              );
            },
            () => {}
          );
        }}
        className="absolute top-4 right-4 z-[1000] bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors border border-slate-200"
        title="Konumuma git"
      >
        📍
      </button>

      {photoMarkerId && (
        <PhotoModal
          markerId={photoMarkerId}
          onDone={() => setPhotoMarkerId(null)}
        />
      )}

      {!user && (
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-white/90 backdrop-blur rounded-xl p-3 text-center text-sm text-slate-600 shadow">
          Sigara eklemek icin giris yap
        </div>
      )}
    </div>
  );
}
