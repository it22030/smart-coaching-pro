package com.smartcoaching.controller;

import com.smartcoaching.dto.AuthResponse;
import com.smartcoaching.entity.User;
import com.smartcoaching.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public ResponseEntity<List<AuthResponse.UserDto>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Long batchId) {

        List<User> users;
        if (role != null && batchId != null) {
            users = userRepository.findByRoleAndBatchId(role, batchId);
        } else if (role != null) {
            users = userRepository.findByRole(role);
        } else {
            users = userRepository.findAll();
        }

        List<AuthResponse.UserDto> dtos = users.stream()
                .map(u -> new AuthResponse.UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole(),
                        u.getBatch() != null ? u.getBatch().getId() : null, u.getPhone(), u.getRollNo()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AuthResponse.UserDto> getUser(@PathVariable Long id) {
        User u = userRepository.findById(id).orElseThrow();
        return ResponseEntity.ok(new AuthResponse.UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole(),
                u.getBatch() != null ? u.getBatch().getId() : null, u.getPhone(), u.getRollNo()));
    }

    @GetMapping("/students-for-course/{courseId}")
    public ResponseEntity<List<AuthResponse.UserDto>> getStudentsForCourse(@PathVariable Long courseId) {
        List<User> students = userRepository.findByRole("student");
        List<AuthResponse.UserDto> dtos = students.stream()
                .map(u -> new AuthResponse.UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole(),
                        u.getBatch() != null ? u.getBatch().getId() : null, u.getPhone(), u.getRollNo()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<AuthResponse.UserDto> updateUser(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        User user = userRepository.findById(id).orElseThrow();
        if (payload.containsKey("name")) user.setName(payload.get("name"));
        if (payload.containsKey("email")) user.setEmail(payload.get("email"));
        if (payload.containsKey("phone")) user.setPhone(payload.get("phone"));
        if (payload.containsKey("rollNo")) user.setRollNo(payload.get("rollNo"));
        userRepository.save(user);
        return ResponseEntity.ok(new AuthResponse.UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole(),
                user.getBatch() != null ? user.getBatch().getId() : null, user.getPhone(), user.getRollNo()));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<?> changePassword(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        User user = userRepository.findById(id).orElseThrow();
        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body("Current password incorrect");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
