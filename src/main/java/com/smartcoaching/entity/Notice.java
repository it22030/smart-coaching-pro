package com.smartcoaching.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notices")
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posted_by_id", nullable = false)
    private User postedBy;

    private String targetRole;
    private String targetBatchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_teacher_id")
    private User targetTeacher;

    private LocalDateTime createdAt = LocalDateTime.now();

    public Notice() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public User getPostedBy() { return postedBy; }
    public void setPostedBy(User postedBy) { this.postedBy = postedBy; }
    public String getTargetRole() { return targetRole; }
    public void setTargetRole(String targetRole) { this.targetRole = targetRole; }
    public String getTargetBatchId() { return targetBatchId; }
    public void setTargetBatchId(String targetBatchId) { this.targetBatchId = targetBatchId; }
    public User getTargetTeacher() { return targetTeacher; }
    public void setTargetTeacher(User targetTeacher) { this.targetTeacher = targetTeacher; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
