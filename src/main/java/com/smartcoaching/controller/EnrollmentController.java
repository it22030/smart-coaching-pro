package com.smartcoaching.controller;

import com.smartcoaching.entity.Course;
import com.smartcoaching.entity.Enrollment;
import com.smartcoaching.entity.User;
import com.smartcoaching.repository.CourseRepository;
import com.smartcoaching.repository.EnrollmentRepository;
import com.smartcoaching.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.transaction.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/enrollments")
public class EnrollmentController {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    public EnrollmentController(EnrollmentRepository enrollmentRepository, CourseRepository courseRepository, UserRepository userRepository) {
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    @GetMapping("/my-courses")
    public ResponseEntity<List<Map<String, Object>>> getMyCourses(@RequestHeader("X-User-Email") String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(user.getId());
        List<Map<String, Object>> courses = enrollments.stream().map(e -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", e.getCourse().getId());
            map.put("name", e.getCourse().getName());
            map.put("fee", e.getCourse().getFee());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(courses);
    }

    @Transactional
    @GetMapping("/available")
    public ResponseEntity<List<Map<String, Object>>> getAvailableCourses(@RequestHeader("X-User-Email") String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Long batchId = user.getBatch() != null ? user.getBatch().getId() : null;

        List<Course> allCourses = courseRepository.findAll();
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(user.getId());
        List<Long> enrolledCourseIds = enrollments.stream().map(e -> e.getCourse().getId()).collect(Collectors.toList());

        List<Map<String, Object>> available = allCourses.stream()
                .filter(c -> c.getBatch() != null && c.getBatch().getId().equals(batchId))
                .filter(c -> !enrolledCourseIds.contains(c.getId()))
                .map(c -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", c.getId());
                    map.put("name", c.getName());
                    map.put("fee", c.getFee());
                    return map;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(available);
    }

    @PostMapping
    public ResponseEntity<?> enrollCourse(@RequestBody Map<String, Long> payload, @RequestHeader("X-User-Email") String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Course course = courseRepository.findById(payload.get("courseId")).orElseThrow();

        if (enrollmentRepository.findByStudentIdAndCourseId(user.getId(), course.getId()).isPresent()) {
            return ResponseEntity.badRequest().body("Already enrolled");
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(user);
        enrollment.setCourse(course);
        enrollmentRepository.save(enrollment);
        return ResponseEntity.ok().build();
    }
}
