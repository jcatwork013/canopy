// Package storage wraps the MinIO/S3 client used for image uploads (presigned)
// and consumed by the readiness "storage" check.
package storage

import (
	"bytes"
	"context"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Config struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
	PublicURL string
}

type Client struct {
	mc     *minio.Client
	bucket string
}

// New builds a MinIO client. It does not perform any network call.
func New(cfg Config) (*Client, error) {
	mc, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, err
	}
	return &Client{mc: mc, bucket: cfg.Bucket}, nil
}

// BucketReachable verifies the configured bucket exists (the readiness probe).
func (c *Client) BucketReachable(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	_, err := c.mc.BucketExists(ctx, c.bucket)
	return err
}

// PresignPut returns a presigned PUT URL for a client-side upload (used Phase 3).
func (c *Client) PresignPut(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	u, err := c.mc.PresignedPutObject(ctx, c.bucket, objectKey, expiry)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

// PutObject uploads bytes server-side (used for sensitive KYC documents, which we
// keep in a private bucket rather than exposing direct browser→MinIO uploads).
func (c *Client) PutObject(ctx context.Context, objectKey, contentType string, data []byte) error {
	_, err := c.mc.PutObject(ctx, c.bucket, objectKey, bytes.NewReader(data), int64(len(data)),
		minio.PutObjectOptions{ContentType: contentType})
	return err
}

// PresignGet returns a short-lived presigned GET URL so an admin can view a
// private object (e.g. a KYC document) without making the bucket public.
func (c *Client) PresignGet(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	u, err := c.mc.PresignedGetObject(ctx, c.bucket, objectKey, expiry, nil)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}
