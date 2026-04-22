package com.smartcoaching.repository;

import com.smartcoaching.entity.Mark;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MarkRepository extends JpaRepository<Mark, Long> {
    List<Mark> findByStudentId(Long studentId);
    List<Mark> findByCourseIdAndSubjectId(Long courseId, Long subjectId);
    Optional<Mark> findByStudentIdAndCourseIdAndSubjectIdAndExamName(Long studentId, Long courseId, Long subjectId, String examName);
    void deleteByCourseId(Long courseId);
}
