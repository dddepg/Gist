package ai

import (
	"context"
	"errors"
)

// Provider defines the interface for AI providers.
type Provider interface {
	// Test sends a test message and returns the response.
	Test(ctx context.Context) (string, error)
	// Name returns the provider name.
	Name() string
}

// Config holds the configuration for an AI provider.
type Config struct {
	Provider        string // openai, anthropic, compatible
	APIKey          string
	BaseURL         string // optional for openai, required for compatible
	Model           string
	Thinking        bool   // enable thinking/reasoning
	ThinkingBudget  int    // Anthropic/Compatible budget_tokens
	ReasoningEffort string // OpenAI/Compatible effort: low/medium/high/xhigh/minimal/none
}

// ProviderType constants
const (
	ProviderOpenAI     = "openai"
	ProviderAnthropic  = "anthropic"
	ProviderCompatible = "compatible"
)

var (
	ErrInvalidProvider = errors.New("invalid provider")
	ErrMissingAPIKey   = errors.New("API key is required")
	ErrMissingBaseURL  = errors.New("base URL is required for compatible provider")
	ErrMissingModel    = errors.New("model is required")
)

// NewProvider creates a new AI provider based on the config.
func NewProvider(cfg Config) (Provider, error) {
	if cfg.APIKey == "" {
		return nil, ErrMissingAPIKey
	}
	if cfg.Model == "" {
		return nil, ErrMissingModel
	}

	switch cfg.Provider {
	case ProviderOpenAI:
		return NewOpenAIProvider(cfg.APIKey, cfg.BaseURL, cfg.Model, cfg.Thinking, cfg.ReasoningEffort)
	case ProviderAnthropic:
		return NewAnthropicProvider(cfg.APIKey, cfg.BaseURL, cfg.Model, cfg.Thinking, cfg.ThinkingBudget)
	case ProviderCompatible:
		if cfg.BaseURL == "" {
			return nil, ErrMissingBaseURL
		}
		return NewCompatibleProvider(cfg.APIKey, cfg.BaseURL, cfg.Model, cfg.Thinking, cfg.ThinkingBudget, cfg.ReasoningEffort)
	default:
		return nil, ErrInvalidProvider
	}
}
