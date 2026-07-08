# Sigara Harita - Proje Planı

## Konsept
Istanbul haritası üzerinde sigara içilen yerleri işaretleme uygulaması. İleride takım bazlı köşe kapmaca yarışması.

---

## Tech Stack

| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| Frontend | Next.js 15 (App Router) | SSR, mobile performance |
| Styling | Tailwind CSS | Hızlı geliştirme |
| Harita | Leaflet + React Leaflet | Ücretsiz, hafif, mobil uyumlu |
| Tile Provider | OpenStreetMap | Ücretsiz, lisans uygun |
| Backend/DB | Supabase | Auth, Realtime, PostgreSQL, Storage |
| Deployment | Vercel | Ücretsiz tier yeterli |
| Language | TypeScript | Tip güvenliği |

---

## Özellikler

### Phase 1 - MVP
- [x] Hesap oluşturma / giriş (Supabase Auth)
- [ ] Istanbul haritası (Leaflet)
- [ ] "Sigara İç" butonu → GPS konumunu al → marker ekle
- [ ] Marker'a tıklayınca tarih/saat göster
- [ ] Sigara ikonu marker olarak
- [ ] Profil sayfası + kişisel istatistikler
  - Toplam sigara sayısı
  - Bu hafta / bu ay
  - En çok içilen bölge
  - Son içilen zaman
- [ ] Tüm kullanıcıların marker'ları haritada görünsün (public)
- [ ] Mobile-first responsive tasarım

### Phase 2 - Takım Sistemi (Köşe Kapmaca)
- [ ] Takım seçimi (Mavi / Kırmızı)
- [ ] Marker rengi takıma göre
- [ ] Bir konumda son içen takımın rengi geçerli (köşe kapmaca)
- [ ] Takım skorboard
- [ ] Bölge hakimiyeti görselleştirmesi

### Phase 3 - Ekstralar
- [ ] Fotoğraf ekleme (Supabase Storage)
- [ ] Başarımlar (achievements): "100. sigara", "Yeni bölge keşfedildi"
- [ ] Arkadaş ekleme
- [ ] Push notifications

---

## Database Schema

### profiles
```sql
id              uuid (PK, references auth.users)
username        text (unique)
display_name    text
team            text (nullable) -- 'blue' | 'red' (Phase 2)
total_smokes    integer (default 0)
created_at      timestamp
```

### smoke_markers
```sql
id              uuid (PK)
user_id         uuid (FK → profiles)
latitude        decimal
longitude       decimal
smoked_at       timestamp (default now())
photo_url       text (nullable, Phase 3)
created_at      timestamp
```

### teams (Phase 2)
```sql
id              uuid (PK)
name            text
color           text -- hex code
score           integer (default 0)
```

### zone_control (Phase 2 - Köşe Kapmaca)
```sql
id              uuid (PK)
latitude        decimal
longitude       decimal
radius          decimal -- metre cinsinden kontrol alanı
controlling_team text -- 'blue' | 'red'
last_smoke_by   uuid (FK → profiles)
last_smoke_at   timestamp
```

---

## Sayfa Yapısı

```
/               → Landing page (giriş/kayıt yönlendirme)
/login          → Giriş
/register       → Kayıt
/map            → Ana harita sayfası (ana ekran)
/profile        → Profil + istatistikler
/leaderboard    → Sıralama (Phase 2)
```

---

## UI/UX Kararları

- **Ana ekran = Harita.** Uygulama açılınca direkt harita gelsin.
- **Floating Action Button (FAB):** Sağ altta büyük "Sigara İç" butonu
- **Marker:** Sigara/duman ikonu (custom SVG)
- **Renk paleti:** Koyu tema (gece kullanımı rahat) veya açık tema (tercihe göre)
- **Mobile:** Bottom navigation (Harita, Profil, Sıralama)
- **Konum:** Butona basınca GPS'ten al, uzun basınca haritaya manuel koy

---

## Riskler & Dikkat Edilecekler

1. **GPS doğruluğu:** Bina içinde düşük olabilir, +-50m tolerans
2. **Leaflet mobile performance:** Çok fazla marker olunca clustering gerekir (react-leaflet-cluster)
3. **Supabase free tier limitleri:** 500MB DB, 1GB storage, 50k auth users — MVP için yeterli
4. **Köşe kapmaca mantığı:** "Aynı yer" tanımı önemli — radius bazlı (örn: 50m yarıçap) düşünülebilir

---

## Başlangıç Adımları

1. Next.js projesi oluştur
2. Supabase projesi kur + tabloları oluştur
3. Auth (kayıt/giriş) entegre et
4. Harita sayfasını kur (Leaflet + Istanbul merkez)
5. "Sigara İç" butonu + marker ekleme
6. Marker'ları DB'den çekip haritada göster
7. Profil + istatistikler
8. Deploy (Vercel)

---

**Son Güncelleme:** 2026-07-07
