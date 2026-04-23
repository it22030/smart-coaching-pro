package com.smartcoaching.controller;

import com.smartcoaching.entity.Period;
import com.smartcoaching.entity.Routine;
import com.smartcoaching.entity.User;
import com.smartcoaching.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.transaction.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/routines")
public class RoutineController {

    private final RoutineRepository routineRepository;
    private final CourseRepository courseRepository;
    private final SubjectRepository subjectRepository;
    private final PeriodRepository periodRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;

    public RoutineController(RoutineRepository routineRepository, CourseRepository courseRepository,
                             SubjectRepository subjectRepository, PeriodRepository periodRepository,
                             UserRepository userRepository, EnrollmentRepository enrollmentRepository) {
        this.routineRepository = routineRepository;
        this.courseRepository = courseRepository;
        this.subjectRepository = subjectRepository;
        this.periodRepository = periodRepository;
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    @Transactional
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllRoutines() {
        List<Routine> routines = routineRepository.findAll();
        return ResponseEntity.ok(routines.stream().map(this::mapRoutine).collect(Collectors.toList()));
    }

    @Transactional
    @GetMapping("/my")
    public ResponseEntity<Map<String, Object>> getMyRoutines(@RequestHeader("X-User-Email") String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        List<Routine> routines;
        if ("teacher".equals(user.getRole())) {
            routines = routineRepository.findByTeacherId(user.getId());
        } else if ("student".equals(user.getRole())) {
            List<Long> enrolledCourseIds = enrollmentRepository.findByStudentId(user.getId())
                    .stream().map(e -> e.getCourse().getId()).collect(Collectors.toList());
            routines = routineRepository.findAll().stream()
                    .filter(r -> enrolledCourseIds.contains(r.getCourse().getId()))
                    .collect(Collectors.toList());
        } else {
            routines = routineRepository.findAll();
        }

        List<Period> periods = periodRepository.findAll();
        List<Map<String, Object>> mappedPeriods = periods.stream().map(p -> {
            Map<String, Object> pm = new HashMap<>();
            pm.put("id", p.getId());
            pm.put("label", p.getLabel());
            pm.put("startTime", p.getStartTime().toString());
            pm.put("endTime", p.getEndTime().toString());
            pm.put("orderIndex", p.getOrderIndex());
            return pm;
        }).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("routines", routines.stream().map(this::mapRoutine).collect(Collectors.toList()));
        result.put("periods", mappedPeriods);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> createRoutine(@RequestBody Map<String, Object> payload) {
        Long courseId = Long.parseLong(payload.get("courseId").toString());
        Long subjectId = Long.parseLong(payload.get("subjectId").toString());
        Long startPeriodId = Long.parseLong(payload.get("startPeriodId").toString());
        Long endPeriodId = Long.parseLong(payload.get("endPeriodId").toString());
        String day = payload.get("day").toString();
        String room = payload.get("room").toString();

        Routine r = new Routine();
        r.setCourse(courseRepository.findById(courseId).orElseThrow());
        r.setSubject(subjectRepository.findById(subjectId).orElseThrow());
        r.setTeacher(subjectRepository.findById(subjectId).orElseThrow().getTeacher());
        r.setDay(day);
        r.setStartPeriod(periodRepository.findById(startPeriodId).orElseThrow());
        r.setEndPeriod(periodRepository.findById(endPeriodId).orElseThrow());
        r.setRoom(room);

        routineRepository.save(r);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRoutine(@PathVariable Long id) {
        routineRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    private Map<String, Object> mapRoutine(Routine r) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", r.getId());
        map.put("courseId", r.getCourse().getId());
        map.put("courseName", r.getCourse().getName());
        map.put("batchName", r.getCourse().getBatch() != null ? r.getCourse().getBatch().getName() : "N/A");
        map.put("subjectId", r.getSubject().getId());
        map.put("subjectName", r.getSubject().getName());
        map.put("teacherId", r.getTeacher() != null ? r.getTeacher().getId() : null);
        map.put("teacherName", r.getTeacher() != null ? r.getTeacher().getName() : "N/A");
        map.put("day", r.getDay());
        map.put("startPeriodId", r.getStartPeriod().getId());
        map.put("endPeriodId", r.getEndPeriod().getId());
        map.put("startPeriodLabel", r.getStartPeriod().getLabel());
        map.put("endPeriodLabel", r.getEndPeriod().getLabel());
        map.put("room", r.getRoom());
        return map;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleException(Exception e) {
        java.io.StringWriter sw = new java.io.StringWriter();
        e.printStackTrace(new java.io.PrintWriter(sw));
        return ResponseEntity.status(500).body(sw.toString());
    }
}
