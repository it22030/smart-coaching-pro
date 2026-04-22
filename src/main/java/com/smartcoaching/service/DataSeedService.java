package com.smartcoaching.service;

import com.smartcoaching.entity.*;
import com.smartcoaching.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class DataSeedService implements CommandLineRunner {

    private final UserRepository userRepository;
    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final SubjectRepository subjectRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeedService(UserRepository userRepository, BatchRepository batchRepository,
                           CourseRepository courseRepository, SubjectRepository subjectRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.subjectRepository = subjectRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            System.out.println("Seeding database...");

            Batch batch24 = new Batch();
            batch24.setName("Batch 2024");
            Batch batch25 = new Batch();
            batch25.setName("Batch 2025");
            batchRepository.save(batch24);
            batchRepository.save(batch25);

            User admin = new User();
            admin.setName("Admin User");
            admin.setEmail("admin@coaching.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("admin");
            admin.setPhone("01700000000");

            User teacher = new User();
            teacher.setName("Sajjad Sir");
            teacher.setEmail("teacher@coaching.com");
            teacher.setPassword(passwordEncoder.encode("teacher123"));
            teacher.setRole("teacher");
            teacher.setPhone("01800000000");

            User student = new User();
            student.setName("Rahim Uddin");
            student.setEmail("student@coaching.com");
            student.setPassword(passwordEncoder.encode("student123"));
            student.setRole("student");
            student.setPhone("01900000000");
            student.setBatch(batch24);
            student.setRollNo("IT22001");

            userRepository.save(admin);
            userRepository.save(teacher);
            userRepository.save(student);

            Course course = new Course();
            course.setName("CSE 4th Year");
            course.setFee(4500);
            course.setBatch(batch24);
            course = courseRepository.save(course);

            Subject sub1 = new Subject();
            sub1.setName("Data Mining");
            sub1.setCourse(course);
            sub1.setTeacher(teacher);

            Subject sub2 = new Subject();
            sub2.setName("Digital Image Processing");
            sub2.setCourse(course);
            sub2.setTeacher(teacher);

            subjectRepository.save(sub1);
            subjectRepository.save(sub2);

            System.out.println("Database seeded successfully.");
        }
    }
}
