package com.smartcoaching.repository;

import com.smartcoaching.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByStudentId(Long studentId);
    void deleteByCourseId(Long courseId);
}
