# n8n Webhook Entegrasyonu

## Webhook URL
Mevcut webhook URL'iniz: `https://bakiucar.atalga.com/webhook/7793c8e1-8bcf-4e00-bd8e-875ddff71ec0`

## n8n Workflow Yapılandırması

### 1. HTTP Request Node Ayarları
- **Method**: POST
- **URL**: `https://bakiucar.atalga.com/webhook/7793c8e1-8bcf-4e00-bd8e-875ddff71ec0`
- **Headers**: 
  ```json
  {
    "Content-Type": "application/json"
  }
  ```

### 2. Body Format (JSON)
```json
{
  "content": "LinkedIn için hazırlanmış içerik metni",
  "topic": "İçerik konusu (opsiyonel)",
  "tone": "professional/casual/friendly (opsiyonel)",
  "platform": "linkedin (opsiyonel)"
}
```

### 3. Örnek n8n Workflow

#### Adım 1: Trigger (Manual/Schedule/Webhook)
```json
{
  "trigger": "manual" // veya zamanlama
}
```

#### Adım 2: Content Generation (ChatGPT/Claude)
```json
{
  "prompt": "LinkedIn için profesyonel bir içerik oluştur",
  "response": "{{ generated_content }}"
}
```

#### Adım 3: HTTP Request to Webhook
```json
{
  "method": "POST",
  "url": "https://bakiucar.atalga.com/webhook/7793c8e1-8bcf-4e00-bd8e-875ddff71ec0",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "content": "{{ $node['ChatGPT'].json.response }}",
    "topic": "AI ve Teknoloji",
    "tone": "professional",
    "platform": "linkedin"
  }
}
```

#### Adım 4: Response Handling
Webhook başarılı olduğunda şu response'u alacaksınız:
```json
{
  "success": true,
  "message": "İçerik başarıyla oluşturuldu",
  "postId": "post_id_here",
  "content": "Gönderilen içerik"
}
```

## Hata Durumları

### 400 Bad Request
```json
{
  "error": "Content parametresi zorunludur"
}
```

### 404 Not Found
```json
{
  "error": "Webhook config bulunamadı"
}
```

### 500 Internal Server Error
```json
{
  "error": "Webhook işlemi sırasında hata oluştu",
  "details": "Hata detayları"
}
```

## Test Etmek İçin

Webhook'u test etmek için aşağıdaki curl komutunu kullanabilirsiniz:

```bash
curl -X POST https://bakiucar.atalga.com/webhook/7793c8e1-8bcf-4e00-bd8e-875ddff71ec0 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Bu bir test içeriğidir",
    "topic": "Test",
    "tone": "professional",
    "platform": "linkedin"
  }'
```

## n8n Workflow Örnekleri

### Basit Metin Gönderimi
1. **Manual Trigger**
2. **Set Node** (içerik hazırlama)
3. **HTTP Request** (webhook'a gönderim)

### Zamanlı İçerik Oluşturma
1. **Cron Trigger** (günlük/haftalık)
2. **ChatGPT/Claude Node** (içerik oluşturma)
3. **HTTP Request** (webhook'a gönderim)

### Koşullu İçerik Gönderimi
1. **Webhook Trigger** (dış kaynak)
2. **IF Node** (koşul kontrolü)
3. **ChatGPT Node** (içerik oluşturma)
4. **HTTP Request** (webhook'a gönderim)

## Önemli Notlar

1. **Content alanı zorunludur** - Boş olamaz
2. **Topic, tone, platform alanları opsiyoneldir**
3. **Response her zaman JSON formatındadır**
4. **Webhook ID'si URL'de sabittir**: `7793c8e1-8bcf-4e00-bd8e-875ddff71ec0`
5. **Başarılı işlemler Post tablosuna kaydedilir**
6. **Hata durumları loglanır**

Bu yapılandırma ile n8n workflow'unuz başarıyla çalışacaktır.
