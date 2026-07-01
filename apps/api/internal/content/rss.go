// Package content aggregates public gardening RSS feeds into a "cẩm nang cây"
// (plant-care handbook). Cached in-memory to avoid hammering the sources.
package content

import (
	"context"
	"encoding/xml"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

type Article struct {
	Title     string `json:"title"`
	Link      string `json:"link"`
	Summary   string `json:"summary"`
	Image     string `json:"image"`
	Source    string `json:"source"`
	Published string `json:"published"`
}

type feed struct{ url, source string }

// Vietnamese gardening / cultivation feeds (báo Nông nghiệp & Dân Việt).
var feeds = []feed{
	{"https://nongnghiep.vn/trong-trot.rss", "Trồng trọt"},
	{"https://nongnghiep.vn/cay-canh-vat-nuoi.rss", "Cây cảnh"},
	{"https://nongnghiep.vn/bao-ve-thuc-vat.rss", "Bảo vệ thực vật"},
	{"https://danviet.vn/nha-nong.rss", "Dân Việt"},
}

type Service struct {
	hc    *http.Client
	mu    sync.Mutex
	cache []Article
	at    time.Time
}

func NewService() *Service { return &Service{hc: &http.Client{Timeout: 10 * time.Second}} }

// Articles returns aggregated, de-imaged articles (cached 30 min).
func (s *Service) Articles(ctx context.Context) []Article {
	s.mu.Lock()
	if len(s.cache) > 0 && time.Since(s.at) < 30*time.Minute {
		c := s.cache
		s.mu.Unlock()
		return c
	}
	s.mu.Unlock()

	var wg sync.WaitGroup
	results := make([][]Article, len(feeds))
	for i, f := range feeds {
		wg.Add(1)
		go func(i int, f feed) {
			defer wg.Done()
			results[i] = s.fetch(ctx, f)
		}(i, f)
	}
	wg.Wait()

	all := []Article{}
	seen := map[string]bool{}
	for _, r := range results {
		for _, a := range r {
			k := a.Link
			if k == "" {
				k = a.Title
			}
			if a.Title == "" || seen[k] || !isPlantRelated(a.Title+" "+a.Summary) {
				continue
			}
			seen[k] = true
			all = append(all, a)
		}
	}
	sort.SliceStable(all, func(i, j int) bool {
		return parseTime(all[i].Published).After(parseTime(all[j].Published))
	})
	if len(all) > 24 {
		all = all[:24]
	}
	s.mu.Lock()
	s.cache = all
	s.at = time.Now()
	s.mu.Unlock()
	return all
}

var imgRe = regexp.MustCompile(`<img[^>]+src=["']([^"']+)["']`)
var tagRe = regexp.MustCompile(`<[^>]+>`)
var wsRe = regexp.MustCompile(`\s+`)

func (s *Service) fetch(ctx context.Context, f feed) []Article {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, f.url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (CanopyBot; +https://canopy.9bricks.com)")
	resp, err := s.hc.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil
	}
	var doc struct {
		Items []struct {
			Title       string `xml:"title"`
			Link        string `xml:"link"`
			Description string `xml:"description"`
			Encoded     string `xml:"encoded"` // content:encoded
			PubDate     string `xml:"pubDate"`
			Enclosure   struct {
				URL string `xml:"url,attr"`
			} `xml:"enclosure"`
		} `xml:"channel>item"`
	}
	if err := xml.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return nil
	}
	out := []Article{}
	for i, it := range doc.Items {
		if i >= 50 {
			break
		}
		img := it.Enclosure.URL
		if img == "" {
			if m := imgRe.FindStringSubmatch(it.Encoded + it.Description); len(m) > 1 {
				img = m[1]
			}
		}
		summary := strings.TrimSpace(wsRe.ReplaceAllString(tagRe.ReplaceAllString(it.Description, " "), " "))
		if r := []rune(summary); len(r) > 200 {
			summary = string(r[:200]) + "…"
		}
		out = append(out, Article{
			Title:     strings.TrimSpace(it.Title),
			Link:      strings.TrimSpace(it.Link),
			Summary:   summary,
			Image:     img,
			Source:    f.source,
			Published: it.PubDate,
		})
	}
	return out
}

// isPlantRelated keeps only articles about plants/gardening (the feeds also
// carry general agri news we don't want in the cây handbook).
func isPlantRelated(s string) bool {
	s = strings.ToLower(s)
	for _, k := range []string{
		"cây cảnh", "cây xanh", "trồng cây", "chăm sóc cây", "bonsai", "sen đá", "xương rồng",
		"hoa lan", "phong lan", "cây kiểng", "cây trồng", "chậu cây", "lá cây", "cây ăn",
		"tưới", "phân bón", "sâu bệnh", "giâm cành", "chiết cành", "vườn", "trồng hoa", "trồng rau",
		"cây nội thất", "thực vật", "giống cây", "bệnh trên cây", "cây phong thủy",
	} {
		if strings.Contains(s, k) {
			return true
		}
	}
	return false
}

func parseTime(s string) time.Time {
	for _, layout := range []string{time.RFC1123Z, time.RFC1123, time.RFC822Z, time.RFC822, time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Time{}
}
