package com.smartcoaching.service;

import com.smartcoaching.config.JwtUtil;
import com.smartcoaching.dto.AuthResponse;
import com.smartcoaching.dto.LoginRequest;
import com.smartcoaching.dto.RegisterRequest;
import com.smartcoaching.entity.Batch;
import com.smartcoaching.entity.User;
import com.smartcoaching.repository.BatchRepository;
import com.smartcoaching.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BatchRepository batchRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;

    public AuthService(UserRepository userRepository, BatchRepository batchRepository,
                       PasswordEncoder passwordEncoder, JwtUtil jwtUtil,
                       AuthenticationManager authenticationManager, CustomUserDetailsService userDetailsService) {
        this.userRepository = userRepository;
        this.batchRepository = batchRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
        String token = jwtUtil.generateToken(userDetailsService.loadUserByUsername(user.getEmail()));
        return new AuthResponse(token, buildUserDto(user));
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        Batch batch = null;
        if ("student".equals(request.getRole())) {
            if (request.getBatchId() == null || request.getRollNo() == null || request.getRollNo().isEmpty()) {
                throw new RuntimeException("Roll NO and Batch ID are required for students");
            }
            if (userRepository.findByRollNoAndRole(request.getRollNo(), "student").isPresent()) {
                throw new RuntimeException("Roll/ID already exists");
            }
            batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new RuntimeException("Batch not found"));
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhone(request.getPhone());
        user.setRole(request.getRole());
        user.setBatch(batch);
        user.setRollNo(request.getRollNo());

        userRepository.save(user);
        String token = jwtUtil.generateToken(userDetailsService.loadUserByUsername(user.getEmail()));
        return new AuthResponse(token, buildUserDto(user));
    }

    private AuthResponse.UserDto buildUserDto(User user) {
        return new AuthResponse.UserDto(
                user.getId(), user.getName(), user.getEmail(), user.getRole(),
                user.getBatch() != null ? user.getBatch().getId() : null,
                user.getPhone(), user.getRollNo()
        );
    }
}
