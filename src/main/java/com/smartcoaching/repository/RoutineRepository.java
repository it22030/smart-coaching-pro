package com.smartcoaching.repository;

import com.smartcoaching.entity.Routine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoutineRepository extends JpaRepository<Routine, Long> {
    List<Routine> findByCourseId(Long courseId);
    List<Routine> findByTeacherId(Long teacherId);
    void deleteByCourseId(Long courseId);
}
