package crypto

import (
	"bytes"
	"testing"
)

func key32() []byte { return []byte("canopy-dev-insecure-key-32bytes!") }

func TestEncryptDecryptRoundTrip(t *testing.T) {
	c, err := New(key32())
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	plaintext := []byte("AIzaSy-super-secret-gemini-key")

	ct, err := c.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if bytes.Contains(ct, plaintext) {
		t.Fatal("ciphertext leaks plaintext")
	}

	got, err := c.Decrypt(ct)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if !bytes.Equal(got, plaintext) {
		t.Fatalf("round-trip mismatch: got %q", got)
	}
}

func TestEncryptIsNonDeterministic(t *testing.T) {
	c, _ := New(key32())
	a, _ := c.EncryptString("same")
	b, _ := c.EncryptString("same")
	if bytes.Equal(a, b) {
		t.Fatal("expected unique nonces to produce different ciphertexts")
	}
}

func TestNewRejectsBadKey(t *testing.T) {
	if _, err := New([]byte("too-short")); err == nil {
		t.Fatal("expected error for non-32-byte key")
	}
}

func TestDecryptRejectsTampered(t *testing.T) {
	c, _ := New(key32())
	ct, _ := c.EncryptString("secret")
	ct[len(ct)-1] ^= 0xFF // flip a tag byte
	if _, err := c.Decrypt(ct); err == nil {
		t.Fatal("expected auth failure on tampered ciphertext")
	}
}
