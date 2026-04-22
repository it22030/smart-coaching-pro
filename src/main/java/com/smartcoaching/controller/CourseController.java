package com.smartcoaching.controller;

import com.smartcoaching.entity.Course;
import com.smartcoaching.entity.Subject;
import com.smartcoaching.repository.BatchRepository;
import com.smartcoaching.repository.CourseRepository;
import com.smartcoaching.repository.SubjectRepository;
import com.smartcoaching.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    public CourseController(CourseRepository courseRepository, BatchRepository batchRepository,
                            SubjectRepository subjectRepository, UserRepository userRepository) {
        this.courseRepository = courseRepository;
        this.batchRepository = batchRepository;
        this.subjectRepository = subjectRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getCourses() {
        List<Course> courses = courseRepository.findAll();
        List<Map<String, Object>> response = courses.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("name", c.getName());
            map.put("fee", c.getFee());
            map.put("batchId", c.getBatch() != null ? c.getBatch().getId() : null);
            map.put("subjects", c.getSubjects().stream().map(s -> {
                Map<String, Object> sMap = new HashMap<>();
                sMap.put("id", s.getId());
                sMap.put("name", s.getName());
                sMap.put("teacherId", s.getTeacher() != null ? s.getTeacher().getId() : null);
                return sMap;
            }).collect(Collectors.toList()));
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createCourse(@RequestBody Map<String, Object> payload) {
        Long batchId = Long.parseLong(payload.get("batchId").toString());
        Course course = new Course();
        course.setName(payload.get("name").toString());
        course.setFee(Integer.parseInt(payload.get("fee").toString()));
        course.setBatch(batchRepository.findById(batchId).orElseThrow());
        return ResponseEntity.ok(courseRepository.save(course));
    }

    @PostMapping("/{courseId}/subjects")
    public ResponseEntity<?> addSubjectToCourse(@PathVariable Long courseId, @RequestBody Map<String, Object> payload) {
        Course course = courseRepository.findById(courseId).orElseThrow();
        Long teacherId = Long.parseLong(payload.get("teacherId").toString());

        Subject subject = new Subject();
        subject.setName(payload.get("name").toString());
        subject.setCourse(course);
        subject.setTeacher(userRepository.findById(teacherId).orElse(null));
        return ResponseEntity.ok(subjectRepository.save(subject));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteCourse(@PathVariable Long id) {
        courseRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
