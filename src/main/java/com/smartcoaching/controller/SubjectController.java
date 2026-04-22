package com.smartcoaching.controller;

import com.smartcoaching.entity.Subject;
import com.smartcoaching.repository.SubjectRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    private final SubjectRepository subjectRepository;

    public SubjectController(SubjectRepository subjectRepository) {
        this.subjectRepository = subjectRepository;
    }

    @GetMapping("/my")
    public ResponseEntity<List<Map<String, Object>>> getMySubjects(Principal principal) {
        List<Subject> all = subjectRepository.findAll();
        List<Map<String, Object>> mySubs = all.stream()
                .filter(s -> s.getTeacher() != null && s.getTeacher().getEmail().equals(principal.getName()))
                .map(s -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("courseId", s.getCourse().getId());
                    map.put("courseName", s.getCourse().getName());
                    map.put("batchName", s.getCourse().getBatch() != null ? s.getCourse().getBatch().getName() : "N/A");
                    map.put("subjectId", s.getId());
                    map.put("subjectName", s.getName());
                    return map;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(mySubs);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteSubject(@PathVariable Long id) {
        subjectRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
