package com.smartcoaching.controller;

import com.smartcoaching.entity.Mark;
import com.smartcoaching.repository.CourseRepository;
import com.smartcoaching.repository.MarkRepository;
import com.smartcoaching.repository.SubjectRepository;
import com.smartcoaching.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/marks")
public class MarksController {

    private final MarkRepository markRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final SubjectRepository subjectRepository;

    public MarksController(MarkRepository markRepository, UserRepository userRepository,
                           CourseRepository courseRepository, SubjectRepository subjectRepository) {
        this.markRepository = markRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.subjectRepository = subjectRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getMarks(
            @RequestParam Long courseId, @RequestParam Long subjectId,
            @RequestParam(required = false) Long studentId) {

        List<Mark> marks = markRepository.findByCourseIdAndSubjectId(courseId, subjectId);
        if (studentId != null) {
            marks = marks.stream().filter(m -> m.getStudent().getId().equals(studentId)).collect(Collectors.toList());
        }

        List<Map<String, Object>> response = marks.stream().map(m -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", m.getId());
            map.put("studentId", m.getStudent().getId());
            map.put("examName", m.getExamName());
            map.put("obtained", m.getObtained());
            map.put("total", m.getTotal());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<Map<String, Object>>> getStudentMarks(@PathVariable Long studentId) {
        List<Mark> marks = markRepository.findByStudentId(studentId);
        List<Map<String, Object>> response = marks.stream().map(m -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", m.getId());
            map.put("courseId", m.getCourse().getId());
            map.put("courseName", m.getCourse().getName());
            map.put("subjectId", m.getSubject().getId());
            map.put("subjectName", m.getSubject().getName());
            map.put("examName", m.getExamName());
            map.put("obtained", m.getObtained());
            map.put("total", m.getTotal());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> uploadMarksBulk(@RequestBody List<Map<String, Object>> payload) {
        for (Map<String, Object> map : payload) {
            Long studentId = Long.parseLong(map.get("studentId").toString());
            Long courseId = Long.parseLong(map.get("courseId").toString());
            Long subjectId = Long.parseLong(map.get("subjectId").toString());
            String examName = map.get("examName").toString();
            double obtained = Double.parseDouble(map.get("obtained").toString());
            double total = Double.parseDouble(map.get("total").toString());

            markRepository.findByStudentIdAndCourseIdAndSubjectIdAndExamName(studentId, courseId, subjectId, examName)
                .ifPresentOrElse(
                    existing -> {
                        existing.setObtained(obtained);
                        existing.setTotal(total);
                        markRepository.save(existing);
                    },
                    () -> {
                        Mark mark = new Mark();
                        mark.setStudent(userRepository.findById(studentId).orElseThrow());
                        mark.setCourse(courseRepository.findById(courseId).orElseThrow());
                        mark.setSubject(subjectRepository.findById(subjectId).orElseThrow());
                        mark.setExamName(examName);
                        mark.setObtained(obtained);
                        mark.setTotal(total);
                        markRepository.save(mark);
                    }
                );
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bulk-assignment")
    public ResponseEntity<?> uploadAssignmentsBulk(@RequestBody List<Map<String, Object>> payload) {
        return uploadMarksBulk(payload);
    }

    @PutMapping("/bulk-edit")
    public ResponseEntity<?> editMarksBulk(@RequestBody List<Map<String, Object>> payload) {
        for (Map<String, Object> map : payload) {
            Long markId = Long.parseLong(map.get("id").toString());
            double obtained = Double.parseDouble(map.get("obtained").toString());
            Mark mark = markRepository.findById(markId).orElseThrow();
            mark.setObtained(obtained);
            markRepository.save(mark);
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMark(@PathVariable Long id) {
        markRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/exam")
    public ResponseEntity<?> deleteExam(
            @RequestParam Long courseId,
            @RequestParam Long subjectId,
            @RequestParam String examName) {
        List<Mark> marks = markRepository.findByCourseIdAndSubjectId(courseId, subjectId)
                .stream()
                .filter(m -> m.getExamName().equals(examName))
                .collect(java.util.stream.Collectors.toList());
        markRepository.deleteAll(marks);
        return ResponseEntity.ok().build();
    }
}
