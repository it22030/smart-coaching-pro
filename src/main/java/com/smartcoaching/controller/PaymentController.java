package com.smartcoaching.controller;

import com.smartcoaching.entity.Course;
import com.smartcoaching.entity.Payment;
import com.smartcoaching.entity.User;
import com.smartcoaching.repository.CourseRepository;
import com.smartcoaching.repository.PaymentRepository;
import com.smartcoaching.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;

    public PaymentController(PaymentRepository paymentRepository, UserRepository userRepository, CourseRepository courseRepository) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllPayments() {
        List<Payment> payments = paymentRepository.findAll();
        return ResponseEntity.ok(payments.stream().map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("studentId", p.getStudent().getId());
            map.put("studentName", p.getStudent().getName());
            map.put("studentRoll", p.getStudent().getRollNo() != null ? p.getStudent().getRollNo() : "");
            map.put("courseId", p.getCourse().getId());
            map.put("courseName", p.getCourse().getName());
            map.put("amount", p.getAmount());
            map.put("reference", p.getReference());
            map.put("description", p.getDescription() != null ? p.getDescription() : "");
            map.put("date", p.getPaymentDate().toString());
            return map;
        }).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<?> makePayment(@RequestBody Map<String, Object> payload, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        Course course = courseRepository.findById(Long.parseLong(payload.get("courseId").toString())).orElseThrow();

        Payment payment = new Payment();
        payment.setStudent(user);
        payment.setCourse(course);
        payment.setAmount(course.getFee());
        payment.setMethod(payload.get("method").toString());
        payment.setReference(payload.get("reference").toString());
        payment.setDescription("Enrollment payment via " + payload.get("method").toString());

        paymentRepository.save(payment);
        return ResponseEntity.ok().build();
    }
}
