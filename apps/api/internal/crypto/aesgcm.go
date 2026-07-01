// Package crypto provides AES-256-GCM encryption for secrets stored at rest in
// the database (system_configs.value_enc, ai_providers.api_key_enc).
//
// Ciphertext layout: nonce(12) || ciphertext || tag. The master key comes from
// CONFIG_ENCRYPTION_KEY (see internal/config). Phases 1+ use Encrypt/Decrypt to
// round-trip admin-supplied API keys.
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"fmt"
	"io"
)

// Cipher wraps an AES-256-GCM AEAD bound to a single master key.
type Cipher struct {
	aead cipher.AEAD
}

// New builds a Cipher from a 32-byte key.
func New(key []byte) (*Cipher, error) {
	if len(key) != 32 {
		return nil, fmt.Errorf("crypto: key must be 32 bytes, got %d", len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Cipher{aead: aead}, nil
}

// Encrypt returns nonce||ciphertext||tag for the given plaintext.
func (c *Cipher) Encrypt(plaintext []byte) ([]byte, error) {
	nonce := make([]byte, c.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	// Seal appends the ciphertext+tag to nonce, giving us the full envelope.
	return c.aead.Seal(nonce, nonce, plaintext, nil), nil
}

// Decrypt reverses Encrypt.
func (c *Cipher) Decrypt(envelope []byte) ([]byte, error) {
	ns := c.aead.NonceSize()
	if len(envelope) < ns {
		return nil, errors.New("crypto: ciphertext too short")
	}
	nonce, ct := envelope[:ns], envelope[ns:]
	return c.aead.Open(nil, nonce, ct, nil)
}

// EncryptString is a convenience wrapper.
func (c *Cipher) EncryptString(s string) ([]byte, error) { return c.Encrypt([]byte(s)) }

// DecryptString is a convenience wrapper.
func (c *Cipher) DecryptString(envelope []byte) (string, error) {
	b, err := c.Decrypt(envelope)
	return string(b), err
}
