package network

import (
	"context"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Noooste/azuretls-client"
	"golang.org/x/net/proxy"
)

// ProxyProvider provides proxy configuration.
// This interface is defined here to avoid import cycles with service package.
type ProxyProvider interface {
	GetProxyURL(ctx context.Context) string
}

// ClientFactory creates HTTP clients with proxy configuration.
type ClientFactory struct {
	proxyProvider     ProxyProvider
	testTransport     http.RoundTripper // For testing only
	testHTTPClient    *http.Client      // For testing only
}

// NewClientFactory creates a new client factory.
func NewClientFactory(proxyProvider ProxyProvider) *ClientFactory {
	return &ClientFactory{proxyProvider: proxyProvider}
}

// NewClientFactoryForTest creates a client factory that uses the given http.Client for testing.
// This is only for use in tests.
func NewClientFactoryForTest(client *http.Client) *ClientFactory {
	return &ClientFactory{
		proxyProvider:  &noopProxyProvider{},
		testHTTPClient: client,
	}
}

// noopProxyProvider returns empty proxy URL.
type noopProxyProvider struct{}

func (p *noopProxyProvider) GetProxyURL(ctx context.Context) string {
	return ""
}

// NewHTTPClient creates a standard http.Client with proxy configuration.
func (f *ClientFactory) NewHTTPClient(ctx context.Context, timeout time.Duration) *http.Client {
	// For testing: return the injected client
	if f.testHTTPClient != nil {
		return f.testHTTPClient
	}

	client := &http.Client{Timeout: timeout}

	// For testing: use injected transport
	if f.testTransport != nil {
		client.Transport = f.testTransport
		return client
	}

	proxyURL := f.proxyProvider.GetProxyURL(ctx)
	if proxyURL != "" {
		client.Transport = newTransportWithProxy(proxyURL)
	}

	return client
}

// NewAzureSession creates an azuretls.Session with proxy configuration.
func (f *ClientFactory) NewAzureSession(ctx context.Context, timeout time.Duration) *azuretls.Session {
	session := azuretls.NewSession()
	session.Browser = azuretls.Chrome
	session.SetTimeout(timeout)

	proxyURL := f.proxyProvider.GetProxyURL(ctx)
	if proxyURL != "" {
		_ = session.SetProxy(proxyURL)
	}

	return session
}

// GetProxyURL returns the current proxy URL.
func (f *ClientFactory) GetProxyURL(ctx context.Context) string {
	return f.proxyProvider.GetProxyURL(ctx)
}

// TestProxy tests if the proxy is working by making a request to the given URL.
func (f *ClientFactory) TestProxy(ctx context.Context, testURL string) error {
	client := f.NewHTTPClient(ctx, 10*time.Second)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, testURL, nil)
	if err != nil {
		return err
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

// NewHTTPTransport creates an http.Transport with proxy configuration.
// This is useful when you need to customize the http.Client (e.g., CheckRedirect).
func (f *ClientFactory) NewHTTPTransport(ctx context.Context) *http.Transport {
	proxyURL := f.proxyProvider.GetProxyURL(ctx)
	if proxyURL != "" {
		return newTransportWithProxy(proxyURL)
	}
	return &http.Transport{}
}

// TestProxyWithConfig tests a proxy configuration without saving it.
func (f *ClientFactory) TestProxyWithConfig(ctx context.Context, proxyURL, testURL string) error {
	client := &http.Client{Timeout: 10 * time.Second}

	if proxyURL != "" {
		client.Transport = newTransportWithProxy(proxyURL)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, testURL, nil)
	if err != nil {
		return err
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

// newTransportWithProxy creates an http.Transport with proper proxy support.
// For SOCKS5 proxies, it uses golang.org/x/net/proxy for correct handling.
// For HTTP/HTTPS proxies, it uses the standard http.ProxyURL.
func newTransportWithProxy(proxyURL string) *http.Transport {
	parsed, err := url.Parse(proxyURL)
	if err != nil {
		return &http.Transport{}
	}

	// Check if it's a SOCKS proxy
	if strings.HasPrefix(parsed.Scheme, "socks") {
		// Extract auth if present
		var auth *proxy.Auth
		if parsed.User != nil {
			auth = &proxy.Auth{
				User: parsed.User.Username(),
			}
			if password, ok := parsed.User.Password(); ok {
				auth.Password = password
			}
		}

		// Create SOCKS5 dialer
		dialer, err := proxy.SOCKS5("tcp", parsed.Host, auth, proxy.Direct)
		if err != nil {
			return &http.Transport{}
		}

		// Create transport with SOCKS5 dialer
		return &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				return dialer.Dial(network, addr)
			},
		}
	}

	// For HTTP/HTTPS proxies, use standard http.ProxyURL
	return &http.Transport{
		Proxy: http.ProxyURL(parsed),
	}
}
