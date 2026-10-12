package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.entity.User;
import com.healthbridge.healthbridgebackend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CurrentUserService {

    private final UserService userService;

    public CurrentUserService(UserService userService) {
        this.userService = userService;
    }

    public User requireCurrentUser() {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        return userService.findByEmail(authentication.getName())
                .filter(User::isActive)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    public void assertSameUser(Long userId) {
        User currentUser = requireCurrentUser();

        if (userId == null || !currentUser.getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }

    public void assertProfileOwner(HealthProfile profile) {
        User currentUser = requireCurrentUser();

        if (profile == null
                || profile.getUser() == null
                || !currentUser.getId().equals(profile.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }
}
