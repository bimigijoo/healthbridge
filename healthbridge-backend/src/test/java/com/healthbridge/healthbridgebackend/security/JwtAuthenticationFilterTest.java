package com.healthbridge.healthbridgebackend.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {
    private final JwtService jwtService = mock(JwtService.class);
    private final CustomUserDetailsService users = mock(CustomUserDetailsService.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, users);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void disabledAccountCannotReuseToken() throws Exception {
        when(jwtService.extractUsername("test-token")).thenReturn("disabled@example.com");
        when(users.loadUserByUsername("disabled@example.com")).thenReturn(
                User.withUsername("disabled@example.com").password("encoded")
                        .roles("WORKER").disabled(true).build());
        assertUnauthenticatedRequestContinues();
        verify(jwtService, never()).isTokenValid(any(), any());
    }

    @Test
    void tokenForDeletedUserDoesNotCauseServerError() throws Exception {
        when(jwtService.extractUsername("test-token")).thenReturn("deleted@example.com");
        when(users.loadUserByUsername("deleted@example.com"))
                .thenThrow(new UsernameNotFoundException("Missing user"));
        assertUnauthenticatedRequestContinues();
    }

    private void assertUnauthenticatedRequestContinues() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer test-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        filter.doFilter(request, response, chain);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request, response);
    }
}
