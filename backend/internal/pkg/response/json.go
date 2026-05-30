package response

import (
	"encoding/json"
	"net/http"
)

type Envelope struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	RequestID string      `json:"request_id,omitempty"`
}

func JSON(w http.ResponseWriter, status int, data interface{}, requestID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(Envelope{
		Success:   true,
		Data:      data,
		RequestID: requestID,
	})
}

func Err(w http.ResponseWriter, status int, errMsg, requestID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(Envelope{
		Success:   false,
		Error:     errMsg,
		RequestID: requestID,
	})
}
