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

// GetTranslateBlockPrompt returns the system prompt for HTML block translation.
func GetTranslateBlockPrompt(language string) string {
	return fmt.Sprintf(`You are an expert translator. Translate this HTML block into %s while preserving the exact HTML structure.

CRITICAL: You MUST translate ALL text content into %s. This is NON-NEGOTIABLE.

Rules:
- Preserve ALL HTML tags, attributes, and structure exactly as-is
- Translate ALL visible text content into %s
- NEVER translate: URLs, href/src attributes, email addresses
- Output ONLY the translated HTML, nothing else
- NEVER wrap output in markdown code blocks
- NO leading or trailing whitespace`, language, language, language)
}

// GetTranslateTextPrompt returns the system prompt for plain text translation.
func GetTranslateTextPrompt(textType, language string) string {
	return fmt.Sprintf(`You are an expert translator. Translate the %s into %s.

CRITICAL: You MUST output in %s. This is NON-NEGOTIABLE. Any response not in %s is a FAILURE.

Rules:
- Output ONLY the translated text in %s, nothing else
- Preserve the original meaning and tone
- Keep proper nouns and brand names unchanged
- NEVER translate URLs
- NO explanations, NO notes, NO markdown formatting
- NO leading or trailing newlines`, textType, language, language, language, language)
}
