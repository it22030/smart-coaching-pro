package com.smartcoaching.controller;

import com.smartcoaching.entity.Attendance;
import com.smartcoaching.repository.AttendanceRepository;
import com.smartcoaching.repository.CourseRepository;
import com.smartcoaching.repository.SubjectRepository;
import com.smartcoaching.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final SubjectRepository subjectRepository;

    public AttendanceController(AttendanceRepository attendanceRepository, UserRepository userRepository,
                                CourseRepository courseRepository, SubjectRepository subjectRepository) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.subjectRepository = subjectRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAttendance(
            @RequestParam Long courseId, @RequestParam Long subjectId) {
        List<Attendance> records = attendanceRepository.findByCourseIdAndSubjectId(courseId, subjectId);
        List<Map<String, Object>> response = records.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("studentId", a.getStudent().getId());
            map.put("date", a.getDate().toString());
            map.put("status", a.getStatus());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<Map<String, Object>>> getStudentAttendance(@PathVariable Long studentId) {
        List<Attendance> records = attendanceRepository.findByStudentId(studentId);
        List<Map<String, Object>> response = records.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("courseId", a.getCourse().getId());
            map.put("courseName", a.getCourse().getName());
            map.put("subjectId", a.getSubject().getId());
            map.put("subjectName", a.getSubject().getName());
            map.put("date", a.getDate().toString());
            map.put("status", a.getStatus());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> markAttendanceBulk(@RequestBody List<Map<String, Object>> payload) {
        for (Map<String, Object> map : payload) {
            Long studentId = Long.parseLong(map.get("studentId").toString());
            Long courseId = Long.parseLong(map.get("courseId").toString());
            Long subjectId = Long.parseLong(map.get("subjectId").toString());
            LocalDate date = LocalDate.parse(map.get("date").toString());
            String status = map.get("status").toString();

            attendanceRepository.findByStudentIdAndCourseIdAndSubjectIdAndDate(studentId, courseId, subjectId, date)
                .ifPresentOrElse(
                    existing -> {
                        existing.setStatus(status);
                        attendanceRepository.save(existing);
                    },
                    () -> {
                        Attendance att = new Attendance();
                        att.setStudent(userRepository.findById(studentId).orElseThrow());
                        att.setCourse(courseRepository.findById(courseId).orElseThrow());
                        att.setSubject(subjectRepository.findById(subjectId).orElseThrow());
                        att.setDate(date);
                        att.setStatus(status);
                        attendanceRepository.save(att);
                    }
                );
        }
        return ResponseEntity.ok().build();
    }
}
