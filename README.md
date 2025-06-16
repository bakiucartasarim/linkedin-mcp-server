# LinkedIn MCP Server

LinkedIn API ile entegre olan bir Model Context Protocol (MCP) server'ı. LinkedIn'de yazı paylaşımı yapmanızı sağlar.

## Özellikler

- LinkedIn'de yazı paylaşımı
- Farklı görünürlük seviyeleri (PUBLIC, CONNECTIONS, LOGGED_IN_MEMBERS)
- OAuth 2.0 authentication desteği

## Kurulum

### Local Development

```bash
npm install
```

### Docker ile Çalıştırma

```bash
# Docker image build et
docker build -t linkedin-mcp-server .

# Container'ı çalıştır
docker run -p 3000:3000 linkedin-mcp-server
```

### Docker Compose ile Çalıştırma

```bash
docker-compose up -d
```

## Coolify Deployment

### Coolify'da Yeni Proje Oluşturma

1. **Coolify Dashboard**'a gidin
2. **New Resource** → **Application** seçin
3. **Git Source** olarak bu repository'yi ekleyin:
   ```
   https://github.com/bakiucartasarim/linkedin-mcp-server.git
   ```

### Coolify Ayarları

**Build Pack:** Docker  
**Dockerfile:** `/Dockerfile` (otomatik algılanır)  
**Port:** `3000`  
**Health Check:** Enabled  

### Environment Variables (Coolify'da)

```env
NODE_ENV=production
PORT=3000
HEALTH_CHECK_ENABLED=true
LOG_LEVEL=info
```

### Coolify Deployment Adımları

1. **Application** oluşturun
2. **Environment Variables** ekleyin
3. **Deploy** butonuna tıklayın
4. **Logs** sekmesinden deployment durumunu takip edin

## Kullanım

### Local Development

```bash
npm start
```

Geliştirme modu için:
```bash
npm run dev
```

### Production (Docker/Coolify)

Server otomatik olarak başlar ve health check'ler çalışır.

### Claude Desktop'a Ekleme

Claude Desktop konfigürasyonunuza şu entry'yi ekleyin:

```json
"linkedin-mcp-server": {
  "command": "node",
  "args": [
    "/home/bakiucar/src/index.js"
  ]
}
```

## LinkedIn Post Paylaşımı

`linkedin_post` tool'unu kullanarak LinkedIn'de yazı paylaşabilirsiniz.

### Parametreler

- `accessToken` (gerekli): LinkedIn OAuth access token
- `content` (gerekli): Paylaşılacak yazı içeriği
- `visibility` (opsiyonel): Gönderi görünürlüğü (varsayılan: PUBLIC)
  - `PUBLIC`: Herkese açık
  - `CONNECTIONS`: Sadece bağlantılar
  - `LOGGED_IN_MEMBERS`: LinkedIn üyeleri

### Örnek Kullanım

```javascript
{
  "name": "linkedin_post",
  "arguments": {
    "accessToken": "your-linkedin-access-token",
    "content": "Merhaba LinkedIn! Bu otomatik bir paylaşımdır.",
    "visibility": "PUBLIC"
  }
}
```

## LinkedIn API Kurulumu

1. [LinkedIn Developer Portal](https://developer.linkedin.com/)'a gidin
2. Yeni bir uygulama oluşturun
3. Gerekli izinleri ekleyin:
   - `r_liteprofile` (profil bilgileri için)
   - `w_member_social` (yazı paylaşımı için)
4. OAuth 2.0 flow'unu kullanarak access token alın

## Mevcut Tools

- `echo`: Verilen metni geri döndürür
- `get_time`: Geçerli zamanı döndürür
- `linkedin_post`: LinkedIn'de yazı paylaşır

## Konfigürasyon

Server stdio transport üzerinde çalışır ve temel hata yönetimi içerir.