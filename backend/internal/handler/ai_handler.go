package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	"gist/backend/internal/service"
)

type AIHandler struct {
	service service.AIService
}

// Request/Response types

type summarizeRequest struct {
	EntryID       string `json:"entryId"`
	Content       string `json:"content"`
	Title         string `json:"title"`
	IsReadability bool   `json:"isReadability"`
}

type summarizeResponse struct {
	Summary string `json:"summary"`
	Cached  bool   `json:"cached"`
}

func NewAIHandler(service service.AIService) *AIHandler {
	return &AIHandler{service: service}
}

func (h *AIHandler) RegisterRoutes(g *echo.Group) {
	g.POST("/ai/summarize", h.Summarize)
}

// Summarize generates an AI summary of the content.
// @Summary Generate AI summary
// @Description Generate an AI summary of the article content. Returns cached result if available, otherwise streams the response.
// @Tags ai
// @Accept json
// @Produce json
// @Produce text/event-stream
// @Param request body summarizeRequest true "Summarize request"
// @Success 200 {object} summarizeResponse "Cached summary"
// @Failure 400 {object} errorResponse
// @Failure 500 {object} errorResponse
// @Router /ai/summarize [post]
func (h *AIHandler) Summarize(c echo.Context) error {
	var req summarizeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Error: "invalid request"})
	}

	if req.Content == "" {
		return c.JSON(http.StatusBadRequest, errorResponse{Error: "content is required"})
	}

	// Parse entry ID
	entryID, err := strconv.ParseInt(req.EntryID, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Error: "invalid entry ID"})
	}

	ctx := c.Request().Context()

	// Check cache first
	cached, err := h.service.GetCachedSummary(ctx, entryID, req.IsReadability)
	if err != nil {
		c.Logger().Errorf("get cached summary: %v", err)
	}
	if cached != nil {
		return c.JSON(http.StatusOK, summarizeResponse{
			Summary: cached.Summary,
			Cached:  true,
		})
	}

	// Generate summary with streaming
	textCh, errCh, err := h.service.Summarize(ctx, entryID, req.Content, req.Title, req.IsReadability)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errorResponse{Error: err.Error()})
	}

	// Set headers for SSE
	c.Response().Header().Set("Content-Type", "text/event-stream")
	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Connection", "keep-alive")
	c.Response().WriteHeader(http.StatusOK)

	var fullText strings.Builder

	// Stream the response
	for {
		select {
		case text, ok := <-textCh:
			if !ok {
				// Channel closed, check for errors
				select {
				case err := <-errCh:
					if err != nil {
						c.Logger().Errorf("summarize error: %v", err)
						// Write error to stream
						fmt.Fprintf(c.Response(), "event: error\ndata: %s\n\n", err.Error())
						c.Response().Flush()
						return nil
					}
				default:
				}

				// Save to cache if we got content
				if fullText.Len() > 0 {
					if err := h.service.SaveSummary(ctx, entryID, req.IsReadability, fullText.String()); err != nil {
						c.Logger().Errorf("save summary: %v", err)
					}
				}

				return nil
			}

			fullText.WriteString(text)

			// Write chunk to stream (plain text, not SSE format for simpler client handling)
			if _, err := c.Response().Write([]byte(text)); err != nil {
				return nil
			}
			c.Response().Flush()

		case <-ctx.Done():
			return nil
		}
	}
}
