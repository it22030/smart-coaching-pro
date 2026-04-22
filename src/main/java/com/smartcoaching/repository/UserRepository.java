package com.smartcoaching.repository;

import com.smartcoaching.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByRollNoAndRole(String rollNo, String role);
    List<User> findByRole(String role);
    List<User> findByRoleAndBatchId(String role, Long batchId);
}
