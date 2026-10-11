package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.UserResponse;
import com.healthbridge.healthbridgebackend.entity.User;
import com.healthbridge.healthbridgebackend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;

    public AdminController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getUsers() {

        List<UserResponse> users = userService.findAll()
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(users);
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<?> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> request,
            Authentication authentication
    ) {
        Boolean active = request.get("active");

        if (active == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "The active field is required."));
        }

        User targetUser = userService.findById(id).orElse(null);

        if (targetUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found."));
        }

        if (!active && targetUser.getEmail().equals(authentication.getName())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "You cannot deactivate your own account."));
        }

        targetUser.setActive(active);
        User updatedUser = userService.saveUser(targetUser);

        return ResponseEntity.ok(Map.of(
                "message", active
                        ? "User account activated successfully."
                        : "User account deactivated successfully.",
                "id", updatedUser.getId(),
                "active", updatedUser.isActive()
        ));
    }

    private UserResponse toResponse(User user) {

        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.isActive()
        );
    }
}