# Coolify Deployment Rehberi

Bu rehber LinkedIn MCP Server'ının Coolify platformunda nasıl deploy edileceğini detaylı olarak açıklar.

## Ön Gereksinimler

- Coolify hesabı ve erişimi
- Bu GitHub repository'sine erişim
- LinkedIn Developer hesabı (OAuth için)

## Adım 1: Coolify'da Proje Oluşturma

### 1.1 Yeni Resource Oluşturma
1. Coolify Dashboard'a giriş yapın
2. **+ New Resource** butonuna tıklayın
3. **Application** seçeneğini seçin

### 1.2 Git Repository Bağlama
1. **Git Source** sekmesinde:
   - **Repository URL:** `https://github.com/bakiucartasarim/linkedin-mcp-server.git`
   - **Branch:** `main` (veya `master`)
   - **Auto Deploy:** Enable (opsiyonel)

### 1.3 Build Ayarları
- **Build Pack:** `Docker`
- **Dockerfile Path:** `/Dockerfile` (otomatik algılanır)
- **Build Context:** `/` (root directory)

## Adım 2: Environment Variables

Coolify'da aşağıdaki environment variable'ları ekleyin:

### Gerekli Variables
```env
NODE_ENV=production
PORT=3000
HEALTH_CHECK_ENABLED=true
LOG_LEVEL=info
```

### Opsiyonel Variables (LinkedIn API için)
```env
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

> **Not:** LinkedIn credentials MCP tool çağrıları sırasında da verilebilir.

## Adım 3: Network ve Port Ayarları

### Port Configuration
- **Container Port:** `3000`
- **Published Port:** Coolify otomatik atayacak
- **Protocol:** `HTTP`

### Health Check Ayarları
- **Health Check Path:** `/` (MCP server stdio üzerinde çalıştığı için özel endpoint yok)
- **Health Check Interval:** `30s`
- **Health Check Timeout:** `3s`
- **Health Check Retries:** `3`

## Adım 4: Resource Limits

### Önerilen Ayarlar
```yaml
Resources:
  Memory: 512MB
  CPU: 0.5 cores
  Storage: 1GB
```

## Adım 5: Deploy İşlemi

### 5.1 Deploy Başlatma
1. Tüm ayarları kontrol edin
2. **Deploy** butonuna tıklayın
3. **Logs** sekmesinden build sürecini takip edin

### 5.2 Build Süreci
Build sırasında şu adımlar gerçekleşir:
1. Docker image oluşturulur
2. Node.js dependencies kurulur
3. Security ayarları uygulanır
4. Container başlatılır

### 5.3 Deployment Doğrulama
Deploy başarılı olduktan sonra:
1. **Logs** sekmesinde şu mesajı görmelisiniz:
   ```
   LinkedIn MCP Server (Production) running on stdio
   Process ID: [PID]
   Node.js version: [VERSION]
   ```

2. Health check logları 30 saniyede bir görünmelidir:
   ```
   Health check: [TIMESTAMP] - Server is running
   ```

## Adım 6: Domain ve SSL

### Custom Domain (Opsiyonel)
1. **Domains** sekmesine gidin
2. Custom domain ekleyin
3. SSL sertifikası otomatik oluşturulur

### Default Coolify Domain
Coolify otomatik olarak şu formatta domain atar:
```
https://[app-name]-[hash].coolify.app
```

## Adım 7: Monitoring ve Logs

### Log Monitoring
- **Application Logs:** Real-time uygulama logları
- **Build Logs:** Deploy sürecindeki loglar
- **Container Logs:** Docker container logları

### Performance Monitoring
- **Resource Usage:** CPU ve Memory kullanımı
- **Network Traffic:** Gelen/giden traffic
- **Uptime:** Uygulama çalışma süresi

## Troubleshooting

### Yaygın Sorunlar

#### 1. Build Hatası
```bash
# Hata: npm install başarısız
# Çözüm: package.json dosyasını kontrol edin
```

#### 2. Container Başlamıyor
```bash
# Hata: Container exit code 1
# Çözüm: Environment variables'ları kontrol edin
```

#### 3. Health Check Başarısız
```bash
# Hata: Health check timeout
# Çözüm: HEALTH_CHECK_ENABLED=true olduğunu kontrol edin
```

### Debug İpuçları

1. **Logs Kontrolü:**
   ```bash
   # Coolify logs sekmesinde şu komutla filtreleme yapabilirsiniz:
   grep "ERROR\|WARN"
   ```

2. **Resource Kontrolü:**
   - Memory kullanımı 512MB'ı geçmesin
   - CPU kullanımı %50'yi geçmesin

3. **Network Kontrolü:**
   - Port 3000 açık olmalı
   - Firewall kuralları kontrol edin

## Güncelleme ve Maintenance

### Auto Deploy
Git repository'de değişiklik yapıldığında otomatik deploy için:
1. **Settings** → **Auto Deploy** → **Enable**
2. Webhook'lar otomatik yapılandırılır

### Manual Deploy
Manuel deploy için:
1. **Deploy** butonuna tekrar tıklayın
2. **Force Rebuild** seçeneğini kullanın

### Backup
Coolify otomatik backup yapmaz, önemli veriler için:
1. Database backup (eğer kullanıyorsanız)
2. Configuration backup
3. Environment variables backup

## Security Best Practices

1. **Environment Variables:**
   - Sensitive değerleri güvenli şekilde saklayın
   - CLIENT_SECRET gibi değerleri loglamayın

2. **Network Security:**
   - Sadece gerekli portları açın
   - HTTPS kullanın

3. **Container Security:**
   - Non-root user kullanın (Dockerfile'da yapılandırılmış)
   - Minimum gereksinim prensibini uygulayın

## Destek ve Yardım

- **Coolify Docs:** https://coolify.io/docs
- **GitHub Issues:** Repository'de issue açabilirsiniz
- **Community:** Coolify Discord/Community