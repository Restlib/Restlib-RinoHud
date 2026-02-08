Config = {}

-- Hız Birimi Çarpanı
-- 3.6      = KM/H (Kilometre)
-- 2.236936 = MPH  (Mil)
Config.SpeedMultiplier = 3.6

-- Yakıt Sistemi Seçimi
-- Seçenekler: 'LegacyFuel', 'lc-fuel', 'native'
-- 'native' seçerseniz GTA'nın kendi yakıt barını veya harici başka scriptleri kullanır.
Config.FuelSystem = 'LegacyFuel'

-- Sunucuya İLK KEZ giren oyuncu hangi HUD ile başlasın?
-- Seçenekler: 'rect' (Klasik), 'round' (Yuvarlak), 'modern' (V3 Modern)
Config.DefaultHudStyle = 'modern' 

-- Bilgi paneli (Para, Meslek vb.) nerede başlasın?
-- Seçenekler: 'right' (Sağ Klasik), 'top' (Üst Bar)
Config.DefaultInfoStyle = 'right'

-- Sunucu genelinde hangi HUD öğeleri aktif olsun?
-- false yapılırsa hem HUD'dan silinir hem de /hud menüsünden gizlenir.
Config.Settings = {
    ['toggle-compass-info'] = true,  -- Pusula ve Yön bilgisi
    ['toggle-server'] = true,        -- "Restlib Studio" yazısı (Sunucu ismi)
    ['toggle-location'] = true,      -- Sokak ve Bölge ismi
    ['toggle-char'] = true,          -- Oyuncu ismi ve ID [5]
    ['toggle-job'] = true,           -- Meslek ve Rütbe bilgisi
    ['toggle-money'] = true,         -- Nakit ve Banka parası
    ['toggle-time'] = true,          -- Saat ve Tarih bilgisi
    ['toggle-veh-name'] = false,      -- Araç marka/model ismi (Minimap üstü)
    ['toggle-master-info'] = false    -- Bilgi panelinin tamamını aç/kapat anahtarı
}