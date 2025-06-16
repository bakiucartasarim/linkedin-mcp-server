# LinkedIn OAuth 2.0 Access Token Alma Rehberi

## 1. LinkedIn Developer Portal Kurulumu

### Adım 1: LinkedIn Developer Portal'a Git
- [LinkedIn Developer Portal](https://developer.linkedin.com/)'a gidin
- LinkedIn hesabınızla giriş yapın

### Adım 2: Yeni Uygulama Oluştur
1. "My apps" sayfasına gidin
2. "Create app" butonuna tıklayın
3. Gerekli bilgileri doldurun:
   - **App name**: Uygulamanızın adı (örn: "My LinkedIn Bot")
   - **LinkedIn Page**: Bir LinkedIn sayfası seçin (kişisel hesap için kişisel profili seçin)
   - **App logo**: Uygulama logosu yükleyin
   - **Legal agreement**: Şartları kabul edin

### Adım 3: Uygulama İzinlerini Ayarla
1. Oluşturulan uygulamanızın sayfasına gidin
2. "Products" sekmesine tıklayın
3. Şu ürünleri ekleyin:
   - **Sign In with LinkedIn** (r_liteprofile izni için)
   - **Share on LinkedIn** (w_member_social izni için)

### Adım 4: OAuth 2.0 Ayarları
1. "Auth" sekmesine gidin
2. **Client ID** ve **Client Secret**'ı not alın
3. **Authorized redirect URLs** bölümüne şunu ekleyin:
   ```
   http://localhost:3000/callback
   ```

## 2. OAuth 2.0 Flow Implementation

### Basit HTML Sayfası ile Test

Aşağıdaki HTML dosyasını oluşturun (`oauth_test.html`):

```html
<!DOCTYPE html>
<html>
<head>
    <title>LinkedIn OAuth Test</title>
</head>
<body>
    <h1>LinkedIn OAuth Test</h1>
    
    <div id="step1">
        <h2>Adım 1: LinkedIn'e Yönlendir</h2>
        <button onclick="authorizeLinkedIn()">LinkedIn ile Giriş Yap</button>
    </div>
    
    <div id="step2" style="display:none;">
        <h2>Adım 2: Authorization Code</h2>
        <input type="text" id="authCode" placeholder="Authorization code'u buraya yapıştırın" style="width:400px;">
        <br><br>
        <button onclick="getAccessToken()">Access Token Al</button>
    </div>
    
    <div id="result" style="display:none;">
        <h2>Sonuç</h2>
        <textarea id="accessToken" style="width:600px;height:100px;" readonly></textarea>
    </div>

    <script>
        const CLIENT_ID = 'YOUR_CLIENT_ID_HERE'; // LinkedIn Client ID'nizi buraya yazın
        const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE'; // LinkedIn Client Secret'ınızı buraya yazın
        const REDIRECT_URI = 'http://localhost:3000/callback';
        
        function authorizeLinkedIn() {
            const scope = 'r_liteprofile w_member_social';
            const state = Math.random().toString(36).substring(7);
            
            const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
                `response_type=code&` +
                `client_id=${CLIENT_ID}&` +
                `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
                `state=${state}&` +
                `scope=${encodeURIComponent(scope)}`;
            
            window.open(authUrl, '_blank');
            
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            
            alert('LinkedIn sayfası açıldı. Giriş yaptıktan sonra yönlendirildiğiniz URL\'deki "code" parametresini kopyalayın.');
        }
        
        async function getAccessToken() {
            const authCode = document.getElementById('authCode').value;
            
            if (!authCode) {
                alert('Lütfen authorization code\'u girin!');
                return;
            }
            
            try {
                const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        code: authCode,
                        client_id: CLIENT_ID,
                        client_secret: CLIENT_SECRET,
                        redirect_uri: REDIRECT_URI
                    })
                });
                
                const data = await response.json();
                
                if (data.access_token) {
                    document.getElementById('accessToken').value = data.access_token;
                    document.getElementById('step2').style.display = 'none';
                    document.getElementById('result').style.display = 'block';
                    
                    console.log('Access Token:', data.access_token);
                    console.log('Expires in:', data.expires_in, 'seconds');
                } else {
                    alert('Hata: ' + JSON.stringify(data));
                }
            } catch (error) {
                alert('Hata: ' + error.message);
            }
        }
    </script>
</body>
</html>
```

### Kullanım Adımları:

1. **HTML dosyasını düzenleyin**:
   - `YOUR_CLIENT_ID_HERE` yerine LinkedIn Client ID'nizi yazın
   - `YOUR_CLIENT_SECRET_HERE` yerine LinkedIn Client Secret'ınızı yazın

2. **HTML dosyasını açın**: Tarayıcıda `oauth_test.html` dosyasını açın

3. **LinkedIn ile giriş yapın**: "LinkedIn ile Giriş Yap" butonuna tıklayın

4. **Authorization code'u alın**:
   - LinkedIn'e yönlendirileceksiniz
   - Giriş yaptıktan sonra bir hata sayfasına yönlendirileceksiniz (normal)
   - URL'deki `code` parametresini kopyalayın
   - Örnek: `http://localhost:3000/callback?code=AQT...&state=...`

5. **Access token alın**:
   - Kopyaladığınız code'u HTML sayfasındaki alana yapıştırın
   - "Access Token Al" butonuna tıklayın
   - Access token'ınız görüntülenecek

## 3. Alternatif: Postman ile Test

### Adım 1: Authorization URL'i Oluştur
```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/callback&state=random_string&scope=r_liteprofile%20w_member_social
```

### Adım 2: Access Token İsteği (Postman)
- Method: `POST`
- URL: `https://www.linkedin.com/oauth/v2/accessToken`
- Headers: `Content-Type: application/x-www-form-urlencoded`
- Body (form-data):
  ```
  grant_type: authorization_code
  code: [AUTHORIZATION_CODE]
  client_id: [YOUR_CLIENT_ID]
  client_secret: [YOUR_CLIENT_SECRET]
  redirect_uri: http://localhost:3000/callback
  ```

## 4. Access Token'ı Test Etme

Access token'ınızı aldıktan sonra test etmek için:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://api.linkedin.com/v2/people/~
```

## Güvenlik Notları

⚠️ **Önemli**: 
- Client Secret'ınızı asla public repository'lerde paylaşmayın
- Access token'lar genellikle 60 gün geçerlidir
- Production'da refresh token kullanarak token'ları yenileyin
- HTTPS kullanın (production için)

## Sorun Giderme

**Hata: "redirect_uri_mismatch"**
- LinkedIn app ayarlarında redirect URI'yi kontrol edin

**Hata: "invalid_scope"** 
- Uygulama izinlerini (Products) kontrol edin

**Hata: "access_denied"**
- Kullanıcı izin vermedi, tekrar deneyin