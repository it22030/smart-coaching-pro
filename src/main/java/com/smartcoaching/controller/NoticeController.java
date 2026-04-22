package com.smartcoaching.controller;

import com.smartcoaching.entity.Notice;
import com.smartcoaching.entity.User;
import com.smartcoaching.repository.NoticeRepository;
import com.smartcoaching.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notices")
public class NoticeController {

    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;

    public NoticeController(NoticeRepository noticeRepository, UserRepository userRepository) {
        this.noticeRepository = noticeRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getNotices(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        List<Notice> all = noticeRepository.findAllByOrderByCreatedAtDesc();

        List<Notice> sent = all.stream().filter(n -> n.getPostedBy().getId().equals(user.getId())).collect(Collectors.toList());
        List<Notice> received;

        if ("admin".equals(user.getRole())) {
            received = all.stream().filter(n -> "admin".equals(n.getTargetRole()) || "all".equals(n.getTargetRole())).collect(Collectors.toList());
        } else if ("teacher".equals(user.getRole())) {
            received = all.stream().filter(n -> "all".equals(n.getTargetRole()) || "teacher".equals(n.getTargetRole()) ||
                    ("specific_teacher".equals(n.getTargetRole()) && n.getTargetTeacher() != null && n.getTargetTeacher().getId().equals(user.getId()))).collect(Collectors.toList());
        } else {
            received = all.stream().filter(n -> ("all".equals(n.getTargetRole()) || "student".equals(n.getTargetRole())) &&
                    ("all".equals(n.getTargetBatchId()) || (user.getBatch() != null && user.getBatch().getId().toString().equals(n.getTargetBatchId())))).collect(Collectors.toList());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("sent", sent.stream().map(this::mapNotice).collect(Collectors.toList()));
        result.put("received", received.stream().map(this::mapNotice).collect(Collectors.toList()));
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> sendNotice(@RequestBody Map<String, Object> payload, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        String content = payload.get("content").toString();
        String targetRole = payload.get("targetRole").toString();
        String targetBatchId = payload.getOrDefault("targetBatchId", "all").toString();

        User targetTeacher = null;
        if (payload.containsKey("targetTeacherId") && payload.get("targetTeacherId") != null && !payload.get("targetTeacherId").toString().isEmpty()) {
            targetTeacher = userRepository.findById(Long.parseLong(payload.get("targetTeacherId").toString())).orElse(null);
        }

        Notice notice = new Notice();
        notice.setContent(content);
        notice.setTargetRole(targetRole);
        notice.setTargetBatchId(targetBatchId);
        notice.setTargetTeacher(targetTeacher);
        notice.setPostedBy(user);

        noticeRepository.save(notice);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/mark-read")
    public ResponseEntity<?> markRead() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount() {
        Map<String, Object> result = new HashMap<>();
        result.put("count", 0);
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> mapNotice(Notice n) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", n.getId());
        map.put("content", n.getContent());
        map.put("targetRole", n.getTargetRole());
        map.put("postedByName", n.getPostedBy().getName());
        map.put("createdAt", n.getCreatedAt().toString());
        map.put("read", true);
        return map;
    }
}
