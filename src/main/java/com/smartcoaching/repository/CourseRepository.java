package com.smartcoaching.repository;

import com.smartcoaching.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {}
