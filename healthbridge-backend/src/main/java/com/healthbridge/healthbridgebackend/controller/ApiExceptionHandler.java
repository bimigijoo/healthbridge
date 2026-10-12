package com.healthbridge.healthbridgebackend.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> statusError(ResponseStatusException exception) {
        String message = exception.getReason();
        return ResponseEntity.status(exception.getStatusCode())
                .body(Map.of("message", message == null ? "Access is not permitted." : message));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validationError(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getDefaultMessage())
                .filter(value -> value != null).findFirst()
                .orElse("Please check the submitted details.");
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<?> uploadTooLarge() {
        return ResponseEntity.status(413).body(Map.of("message", "Files must be no larger than 10 MB."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflictingData() {
        return ResponseEntity.status(409).body(Map.of("message",
                "This action conflicts with an existing or related record. Refresh and try again."));
    }
}
