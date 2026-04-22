package com.smartcoaching.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "routines")
public class Routine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(name = "\"day\"", nullable = false)
    private String day;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "start_period_id", nullable = false)
    private Period startPeriod;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "end_period_id", nullable = false)
    private Period endPeriod;

    private String room;

    public Routine() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }
    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }
    public User getTeacher() { return teacher; }
    public void setTeacher(User teacher) { this.teacher = teacher; }
    public String getDay() { return day; }
    public void setDay(String day) { this.day = day; }
    public Period getStartPeriod() { return startPeriod; }
    public void setStartPeriod(Period startPeriod) { this.startPeriod = startPeriod; }
    public Period getEndPeriod() { return endPeriod; }
    public void setEndPeriod(Period endPeriod) { this.endPeriod = endPeriod; }
    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }
}
