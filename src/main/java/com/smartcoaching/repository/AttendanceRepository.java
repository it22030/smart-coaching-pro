package com.smartcoaching.repository;

import com.smartcoaching.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByStudentId(Long studentId);
    List<Attendance> findByCourseIdAndSubjectId(Long courseId, Long subjectId);
    Optional<Attendance> findByStudentIdAndCourseIdAndSubjectIdAndDate(Long studentId, Long courseId, Long subjectId, LocalDate date);
    void deleteByCourseId(Long courseId);
}
