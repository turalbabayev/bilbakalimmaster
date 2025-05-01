# Teknik Tasarım Dokümanı

**Başlık:** JSON'dan XML'e Dönüştürme Web Uygulaması  
**Hazırlayan:** Tural BABAYEV / ABCVYZ  
**Doküman Versiyonu:** 1.0  
**Tarih:** 02.05.2025  

---

## 1. Mimari Tasarım

### 1.1 Genel Mimari
Uygulama, aşağıdaki ana bileşenlerden oluşacaktır:

- **Frontend Katmanı:** Single Page Application (SPA)
- **Servis Katmanı:** JSON işleme, XML dönüşümü ve API entegrasyonları
- **Veri Katmanı:** NoSQL veritabanı entegrasyonu

### 1.2 Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
|--------|-----------|-----------|
| Frontend | HTML5, CSS3, JavaScript | Temel web teknolojileri |
| UI Framework | Bootstrap (CDN) | Responsive tasarım için |
| JSON İşleme | Native JavaScript | JSON parsing ve validasyon |
| XML Dönüşüm | Native JavaScript | XML string oluşturma |
| HTTP İstekleri | Axios (CDN) | API çağrıları için |

---

## 2. Arayüz Tasarımı

### 2.1 Ana Sayfa Bileşenleri

```ascii
+------------------------------------------+
|                 Header                    |
|  "JSON to XML Converter"                 |
+------------------------------------------+
|                                          |
|   +------------------------------------+ |
|   |           JSON Input               | |
|   |   [        TextArea         ]      | |
|   |                                    | |
|   +------------------------------------+ |
|                                          |
|   +------------------------------------+ |
|   |         Validation Status          | |
|   +------------------------------------+ |
|                                          |
|   [Convert and Submit]                   |
|                                          |
|   +------------------------------------+ |
|   |         Response Status            | |
|   +------------------------------------+ |
|                                          |
+------------------------------------------+
```

### 2.2 Kullanıcı Etkileşimi Akışı

1. Kullanıcı JSON verisini textarea'ya girer
2. Sistem gerçek zamanlı JSON formatı kontrolü yapar
3. Kullanıcı "Convert and Submit" butonuna tıklar
4. Sistem validasyon yapar ve sonucu gösterir
5. Başarılı validasyon sonrası XML dönüşümü yapılır
6. XML verisi API'ye gönderilir
7. İşlem sonucu kullanıcıya gösterilir

---

## 3. Veri Yapıları

### 3.1 Giriş JSON Şeması

```json
{
  "type": "object",
  "required": ["from_msisdn", "to_msisdn", "message", "encoding"],
  "properties": {
    "from_msisdn": {
      "type": "string",
      "pattern": "^[0-9]{14}$"
    },
    "to_msisdn": {
      "type": "string",
      "pattern": "^[0-9]{14}$"
    },
    "message": {
      "type": "string"
    },
    "encoding": {
      "type": "string"
    },
    "field-map": {
      "type": "object",
      "patternProperties": {
        "^.*$": {
          "enum": ["integer", "string", "boolean", "float"]
        }
      }
    }
  }
}
```

### 3.2 Çıkış XML Yapısı

```xml
<envelope>
  <from_msisdn>12345678901234</from_msisdn>
  <to_msisdn>12345678901234</to_msisdn>
  <message>Test message</message>
  <encoding>UTF-8</encoding>
  <custom_field type="integer">123</custom_field>
</envelope>
```

### 3.3 Audit Log Yapısı

```json
{
  "timestamp": "2025-05-02T10:00:00Z",
  "action": "CONVERT_AND_SUBMIT",
  "status": "SUCCESS|ERROR",
  "input_json": "{...}",
  "output_xml": "<...>",
  "error_message": "Optional error details"
}
```

---

## 4. API Entegrasyonları

### 4.1 XML Gönderim API'si

- **Endpoint:** `http:/transter.to/api/xml`
- **Method:** POST
- **Headers:**
  - Content-Type: application/xml
- **Response Codes:**
  - 200: Başarılı
  - 400: Geçersiz XML
  - 500: Sunucu Hatası

### 4.2 Audit Log API'si

- **Endpoint:** `http://db.com/query`
- **Method:** POST
- **Headers:**
  - Content-Type: application/json
- **Response Codes:**
  - 200: Başarılı
  - 400: Geçersiz İstek
  - 500: Sunucu Hatası

---

## 5. Hata Yönetimi

### 5.1 Hata Kategorileri

1. **Kullanıcı Giriş Hataları**
   - Geçersiz JSON formatı
   - Eksik zorunlu alanlar
   - Geçersiz MSISDN formatı

2. **Sistem Hataları**
   - XML dönüşüm hataları
   - API bağlantı hataları
   - Audit log kayıt hataları

### 5.2 Hata Mesajları

| Kod | Mesaj | Eylem |
|-----|-------|-------|
| E001 | "Geçersiz JSON formatı" | Kullanıcıya format düzeltme talimatı |
| E002 | "Zorunlu alan eksik" | Eksik alanların listesi |
| E003 | "Geçersiz MSISDN formatı" | Format açıklaması |
| E004 | "API bağlantı hatası" | Tekrar deneme önerisi |

---

## 6. Güvenlik Önlemleri

1. **Giriş Doğrulama**
   - JSON boyut limiti (max 1MB)
   - XSS önleme
   - SQL injection önleme

2. **API Güvenliği**
   - CORS politikası
   - Rate limiting
   - Request timeout (30 sn)

---

## 7. Test Stratejisi

### 7.1 Birim Testleri
- JSON validasyon
- XML dönüşüm
- Hata yakalama

### 7.2 Entegrasyon Testleri
- API bağlantıları
- Audit log kaydı

### 7.3 UI Testleri
- Form gönderimi
- Hata mesajları
- Yükleme durumları

---

## Footer

**Hazırlayan:** Tural BABAYEV / ABCVYZ  
**Tarih:** 02.05.2025  
**Onaylayan:**   
**Onay Tarihi:**
