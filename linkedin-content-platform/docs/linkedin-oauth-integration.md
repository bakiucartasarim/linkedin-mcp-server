# LinkedIn OAuth Entegrasyonu

Bu belge, LinkedIn içerik paylaşım platformunda LinkedIn API OAuth entegrasyonunu yapılandırma sürecini detaylı olarak açıklar.

## Gereksinimler

LinkedIn API ile entegrasyon yapabilmek için şunlara ihtiyacınız olacak:

1. LinkedIn Developer hesabı
2. LinkedIn uygulaması
3. Client ID ve Primary Client Secret
4. n8n (self-hosted veya cloud) kurulumu

## LinkedIn Developer Portalında Uygulama Oluşturma

### 1. Hesap Oluşturma ve Giriş

- [LinkedIn Developer Portal](https://www.linkedin.com/developers/)'a gidin
- LinkedIn hesabınızla giriş yapın veya yeni bir hesap oluşturun
- Oturum açtıktan sonra "Create App" (Uygulama Oluştur) düğmesine tıklayın

### 2. Uygulama Bilgilerini Doldurma

![LinkedIn App Creation](https://socialhub.atalga.com/images/docs/linkedin-app-creation.png)

- **App Name**: Şirketinizin adını veya tanımlayıcı bir isim kullanın
- **LinkedIn Page**: Şirketinizin LinkedIn sayfasını seçin (isteğe bağlı)
- **App Logo**: Şirketinizin logosunu yükleyin (isteğe bağlı)
- **Legal Agreement**: Şartları kabul edin
- "Create App" (Uygulama Oluştur) düğmesine tıklayın

### 3. Ürünleri Etkinleştirme

LinkedIn uygulamanız oluşturulduktan sonra:

1. Sol menüden "Products" (Ürünler) sekmesine tıklayın
2. "Marketing Developer Platform" ürününü bulun
3. "Request Access" (Erişim İste) düğmesine tıklayın
4. Gerekli formu doldurun ve onaylayın

### 4. OAuth 2.0 Ayarları

1. Sol menüden "Auth" sekmesine tıklayın
2. "OAuth 2.0 settings" (OAuth 2.0 ayarları) bölümünü bulun
3. "Redirect URLs" (Yönlendirme URL'leri) alanına aşağıdaki URL'i ekleyin:
   ```
   https://bakiucar.atalga.com/rest/oauth2-credential/callback
   ```
   (veya kendi n8n sunucunuzun yönlendirme URL'sini kullanın)
4. "Update" (Güncelle) düğmesine tıklayın

### 5. İzinleri Yapılandırma

"OAuth 2.0 scopes" (İzinler) bölümünde, aşağıdaki izni ekleyin:

- `w_member_social`: İçerik paylaşım izni

**Not**: Bazı belgeler eski izinleri (`r_liteprofile`, `r_emailaddress`, `r_basicprofile` gibi) içerebilir, ancak bu izinler değişmiş olabilir. LinkedIn'in güncel izin listesine göre hareket edin.

### 6. Kimlik Bilgilerini Alma

"Auth" sekmesinde, uygulamanızın şu bilgilerini bulun ve kaydedin:

- **Client ID**: Uygulamanızın benzersiz tanımlayıcısı
- **Primary Client Secret**: Uygulamanızın gizli anahtarı

**Not**: Bu bilgileri güvenli bir şekilde saklayın ve başkalarıyla paylaşmayın.

## Platform Üzerinde OAuth Yapılandırması

### 1. LinkedIn OAuth Sayfasına Erişim

- LinkedIn içerik platformunda oturum açın
- Ayarlar sayfasına gidin
- "LinkedIn OAuth" kartına tıklayın veya doğrudan `/settings/linkedin-oauth` sayfasına gidin

### 2. Kimlik Bilgilerini Girme

![LinkedIn OAuth Configuration](https://socialhub.atalga.com/images/docs/linkedin-oauth-config.png)

- **Client ID**: LinkedIn Developer Portal'dan aldığınız Client ID'yi girin
- **Primary Client Secret**: LinkedIn Developer Portal'dan aldığınız Primary Client Secret'ı girin
- **Redirect URI**: Varsayılan değeri (`https://bakiucar.atalga.com/rest/oauth2-credential/callback`) kullanın veya kendi n8n sunucunuzun yönlendirme URL'sini girin
- "Ayarları Kaydet" düğmesine tıklayın

### 3. LinkedIn Hesabını Yetkilendirme

Kimlik bilgilerinizi kaydettikten sonra:

1. Oluşturulan yetkilendirme bağlantısına tıklayın
2. LinkedIn hesabınızla giriş yapın (gerekirse)
3. Uygulama izinlerini onaylayın
4. Başarılı bir yetkilendirmeden sonra n8n'e yönlendirileceksiniz

## n8n'de LinkedIn Node Kullanımı

### 1. LinkedIn OAuth Bilgilerini n8n'e Ekleme

- n8n arayüzünde "Credentials" bölümüne gidin
- "New Credential" (Yeni Kimlik Bilgisi) düğmesine tıklayın
- "LinkedIn" seçin
- Daha önce aldığınız Client ID ve Client Secret bilgilerini girin
- Kimlik bilgisini kaydedin

### 2. LinkedIn Node Ekleme

- n8n workflow'unuza bir "LinkedIn" node'u ekleyin
- Oluşturduğunuz kimlik bilgisini seçin
- İşlem türünü (post, comment, vs.) seçin
- Gerekli parametreleri yapılandırın

### 3. Test ve Doğrulama

- Node'u test etmek için "Execute Node" (Node'u Çalıştır) düğmesine tıklayın
- LinkedIn hesabınızda paylaşım yapılıp yapılmadığını kontrol edin

## Örnek n8n Workflow

Aşağıda, LinkedIn'de metin paylaşımı yapan basit bir n8n workflow örneği verilmiştir:

```json
{
  "nodes": [
    {
      "parameters": {
        "url": "https://bakiucar.atalga.com/webhook/7793c8e1-8bcf-4e00-bd8e-875ddff71ec0",
        "options": {
          "redirect": true
        }
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [
        250,
        300
      ]
    },
    {
      "parameters": {
        "resource": "post",
        "text": "={{$node[\"Webhook\"].json[\"content\"]}}",
        "additionalFields": {
          "visibility": "PUBLIC"
        }
      },
      "name": "LinkedIn Post",
      "type": "n8n-nodes-base.linkedin",
      "position": [
        500,
        300
      ],
      "credentials": {
        "linkedInOAuth2Api": "LinkedIn OAuth"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "LinkedIn Post",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## Sorun Giderme

### Genel Sorunlar ve Çözümleri

#### İzin Hatası (Scope Error)

**Sorun**: "Scope ... is not authorized for your application" hatası alıyorsunuz.

**Çözüm**:
1. LinkedIn Developer Portal'da uygulamanız için doğru ürünlerin etkinleştirildiğinden emin olun:
   - "Marketing Developer Platform" (w_member_social izni için)
2. İzinleri yeniden ekleyin ve uygulamayı güncelleyin
3. Sadece gerekli olan izinleri kullanın, LinkedIn API değişimleri nedeniyle bazı eski izinler artık çalışmıyor olabilir
4. İzinleri basit tutun, öncelikle sadece `w_member_social` izniyle deneyin

#### OAuth Callback Hatası

**Sorun**: Yetkilendirme sırasında "Invalid redirect URI" hatası alıyorsunuz.

**Çözüm**:
1. LinkedIn Developer Portal'da doğru yönlendirme URL'sinin eklendiğinden emin olun
2. URL'nin tam olarak eşleştiğini kontrol edin (https:// dahil)
3. Yönlendirme URL'sinin doğru formatta olduğundan emin olun

#### İçerik Paylaşım Hatası

**Sorun**: İçerik paylaşılmıyor veya "Insufficient permissions" hatası alıyorsunuz.

**Çözüm**:
1. `w_member_social` izninin eklendiğinden emin olun
2. LinkedIn uygulamanızın "Marketing Developer Platform" ürününe erişim hakkına sahip olduğunu kontrol edin
3. LinkedIn Developer portalında uygulama durumunu kontrol edin - onay bekleyen izinler olabilir

#### Geri Dönüş Hatası

**Sorun**: Yetkilendirme tamamlandıktan sonra "Bummer, something went wrong" hatası alıyorsunuz.

**Çözüm**:
1. Uygulamanızın izinlerini ve ürünlerini kontrol edin
2. Uygulamanızın durumunu kontrol edin - bazı izinler onay gerektirebilir
3. Redirect URI'yi tam olarak kontrol edin
4. Farklı bir tarayıcı veya gizli modda tekrar deneyin
5. Yalnızca gerekli olan minimum izinleri kullanın

## LinkedIn API Değişiklikleri

LinkedIn API'si zaman içinde değişikliğe uğrayabilir. 2023-2025 arasında, LinkedIn API'sinde bazı önemli değişiklikler yapılmıştır:

- Bazı eski izinler artık desteklenmemektedir
- İzin adları ve kapsamları değişmiş olabilir
- "Marketing Developer Platform" ürünü, içerik paylaşımı için gereklidir
- İzin yetkilendirmeleri için onay süreçleri değişmiş olabilir

Bu değişiklikler nedeniyle, mevcut entegrasyonlarınızı güncellemek ve en son LinkedIn API dokümantasyonunu takip etmek önemlidir.

## İletişim ve Destek

Entegrasyon sırasında sorun yaşarsanız:

- **Email**: support@socialhub.atalga.com
- **Destek Portalı**: [help.socialhub.atalga.com](https://help.socialhub.atalga.com)

---

Bu belge LinkedIn OAuth entegrasyonu için temel bir kılavuzdur. LinkedIn veya n8n'in API değişiklikleri nedeniyle bazı adımlar zamanla değişebilir.
