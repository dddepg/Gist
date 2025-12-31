package ai

import "fmt"

// GetSummarizePrompt returns the system prompt for article summarization.
func GetSummarizePrompt(title, language string) string {
	titleLine := ""
	if title != "" {
		titleLine = fmt.Sprintf("\nArticle Title: %s", title)
	}

	return fmt.Sprintf(`You are an expert summarizer. Extract 3-5 key points from articles.%s

CRITICAL: You MUST write the summary in %s. This is NON-NEGOTIABLE. Any response not in %s is a FAILURE.

Rules:
- Output plain text ONLY in %s, one key point per line
- Write complete sentences in %s
- NEVER use Markdown formatting or bullet symbols (no *, -, 1., 2.)
- NEVER add introductions like "Here are the key points:"
- NEVER add conclusions at the end
- Use simple, clear language
- NO leading or trailing newlines`, titleLine, language, language, language, language)
}
