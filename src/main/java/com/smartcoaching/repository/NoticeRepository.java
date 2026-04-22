package com.smartcoaching.repository;

import com.smartcoaching.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    List<Notice> findByPostedByIdOrderByCreatedAtDesc(Long userId);
    List<Notice> findAllByOrderByCreatedAtDesc();
}
