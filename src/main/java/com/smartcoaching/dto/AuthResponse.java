package com.smartcoaching.dto;

public class AuthResponse {
    private String token;
    private UserDto user;

    public AuthResponse(String token, UserDto user) {
        this.token = token;
        this.user = user;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public UserDto getUser() { return user; }
    public void setUser(UserDto user) { this.user = user; }

    public static class UserDto {
        private Long id;
        private String name;
        private String email;
        private String role;
        private Long batchId;
        private String phone;
        private String rollNo;

        public UserDto(Long id, String name, String email, String role, Long batchId, String phone, String rollNo) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.role = role;
            this.batchId = batchId;
            this.phone = phone;
            this.rollNo = rollNo;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public Long getBatchId() { return batchId; }
        public void setBatchId(Long batchId) { this.batchId = batchId; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getRollNo() { return rollNo; }
        public void setRollNo(String rollNo) { this.rollNo = rollNo; }
    }
}
