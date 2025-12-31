package service

import (
	"context"
	"fmt"

	"gist/backend/internal/model"
	"gist/backend/internal/repository"
	"gist/backend/internal/service/ai"
)

// AIService provides AI-related operations like summarization.
type AIService interface {
	// GetCachedSummary returns a cached summary if available.
	GetCachedSummary(ctx context.Context, entryID int64, isReadability bool) (*model.AISummary, error)
	// Summarize generates a summary using AI streaming.
	// Returns channels for text chunks and errors.
	Summarize(ctx context.Context, entryID int64, content, title string, isReadability bool) (<-chan string, <-chan error, error)
	// SaveSummary saves a summary to cache.
	SaveSummary(ctx context.Context, entryID int64, isReadability bool, summary string) error
	// GetSummaryLanguage returns the configured summary language.
	GetSummaryLanguage(ctx context.Context) string
}

type aiService struct {
	summaryRepo  repository.AISummaryRepository
	settingsRepo repository.SettingsRepository
}

// NewAIService creates a new AI service.
func NewAIService(summaryRepo repository.AISummaryRepository, settingsRepo repository.SettingsRepository) AIService {
	return &aiService{
		summaryRepo:  summaryRepo,
		settingsRepo: settingsRepo,
	}
}

func (s *aiService) GetCachedSummary(ctx context.Context, entryID int64, isReadability bool) (*model.AISummary, error) {
	language := s.GetSummaryLanguage(ctx)
	return s.summaryRepo.Get(ctx, entryID, isReadability, language)
}

func (s *aiService) Summarize(ctx context.Context, entryID int64, content, title string, isReadability bool) (<-chan string, <-chan error, error) {
	// Get AI configuration
	cfg, err := s.getAIConfig(ctx)
	if err != nil {
		return nil, nil, err
	}

	// Create provider
	provider, err := ai.NewProvider(cfg)
	if err != nil {
		return nil, nil, fmt.Errorf("create provider: %w", err)
	}

	// Get language setting
	language := s.GetSummaryLanguage(ctx)

	// Build system prompt
	systemPrompt := ai.GetSummarizePrompt(title, language)

	// Start streaming
	textCh, errCh := provider.SummarizeStream(ctx, systemPrompt, content)

	return textCh, errCh, nil
}

func (s *aiService) SaveSummary(ctx context.Context, entryID int64, isReadability bool, summary string) error {
	language := s.GetSummaryLanguage(ctx)
	return s.summaryRepo.Save(ctx, entryID, isReadability, language, summary)
}

func (s *aiService) GetSummaryLanguage(ctx context.Context) string {
	setting, err := s.settingsRepo.Get(ctx, "ai.summary_language")
	if err != nil || setting == nil || setting.Value == "" {
		return "zh-CN" // default
	}
	return setting.Value
}

func (s *aiService) getAIConfig(ctx context.Context) (ai.Config, error) {
	var cfg ai.Config

	// Get provider
	if setting, err := s.settingsRepo.Get(ctx, "ai.provider"); err == nil && setting != nil {
		cfg.Provider = setting.Value
	}
	if cfg.Provider == "" {
		cfg.Provider = ai.ProviderOpenAI
	}

	// Get API key
	if setting, err := s.settingsRepo.Get(ctx, "ai.api_key"); err == nil && setting != nil {
		cfg.APIKey = setting.Value
	}
	if cfg.APIKey == "" {
		return cfg, fmt.Errorf("AI API key is not configured")
	}

	// Get base URL
	if setting, err := s.settingsRepo.Get(ctx, "ai.base_url"); err == nil && setting != nil {
		cfg.BaseURL = setting.Value
	}

	// Get model
	if setting, err := s.settingsRepo.Get(ctx, "ai.model"); err == nil && setting != nil {
		cfg.Model = setting.Value
	}
	if cfg.Model == "" {
		return cfg, fmt.Errorf("AI model is not configured")
	}

	// Get thinking settings
	if setting, err := s.settingsRepo.Get(ctx, "ai.thinking"); err == nil && setting != nil && setting.Value == "true" {
		cfg.Thinking = true
	}

	if setting, err := s.settingsRepo.Get(ctx, "ai.thinking_budget"); err == nil && setting != nil {
		var budget int
		fmt.Sscanf(setting.Value, "%d", &budget)
		cfg.ThinkingBudget = budget
	}

	if setting, err := s.settingsRepo.Get(ctx, "ai.reasoning_effort"); err == nil && setting != nil {
		cfg.ReasoningEffort = setting.Value
	}

	return cfg, nil
}
