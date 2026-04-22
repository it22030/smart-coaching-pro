package com.smartcoaching.repository;

import com.smartcoaching.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByCourseId(Long courseId);
    List<Subject> findByTeacherId(Long teacherId);
}
