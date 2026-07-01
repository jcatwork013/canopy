package sysconfig

// Known system_configs keys. Secrets are encrypted at rest; non-secrets stored
// as plaintext-in-ciphertext too (uniform handling) but masked accordingly.
const (
	KeyResendAPIKey  = "resend_api_key"    // secret, category email
	KeyResendFrom    = "resend_from"       // non-secret sender, e.g. "Canopy <no-reply@...>"
	KeyAppName       = "app_name"          // non-secret, general
	KeyConfidenceMin = "ai_confidence_min" // non-secret threshold
	// Public website settings (non-secret), edited in the admin "Website" tab.
	KeySiteTagline      = "site_tagline"
	KeySiteContactPhone = "site_contact_phone"
	KeySiteHeroImages   = "site_hero_images" // JSON array of image URLs
)

// Category groups configs for the admin UI.
const (
	CategoryAI      = "ai"
	CategoryEmail   = "email"
	CategoryStorage = "storage"
	CategoryGeneral = "general"
	CategoryWebsite = "website"
)

// configMeta describes each known key for the admin endpoint (category + secret).
type configMeta struct {
	Key      string
	Category string
	Secret   bool
}

var knownConfigs = []configMeta{
	{KeyResendAPIKey, CategoryEmail, true},
	{KeyResendFrom, CategoryEmail, false},
	{KeyAppName, CategoryGeneral, false},
	{KeyConfidenceMin, CategoryGeneral, false},
	{KeySiteTagline, CategoryWebsite, false},
	{KeySiteContactPhone, CategoryWebsite, false},
	{KeySiteHeroImages, CategoryWebsite, false},
}

func metaFor(key string) (configMeta, bool) {
	for _, m := range knownConfigs {
		if m.Key == key {
			return m, true
		}
	}
	return configMeta{}, false
}
