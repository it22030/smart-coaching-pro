package com.smartcoaching.controller;

import com.smartcoaching.entity.Message;
import com.smartcoaching.entity.User;
import com.smartcoaching.repository.MessageRepository;
import com.smartcoaching.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.transaction.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageController(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    @GetMapping
    public ResponseEntity<?> getMessages(@RequestHeader("X-User-Email") String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();

        List<Message> inbox = messageRepository.findByReceiverIdOrderByTimestampDesc(user.getId());
        List<Message> sent = messageRepository.findBySenderIdOrderByTimestampDesc(user.getId());

        Map<String, Object> result = new HashMap<>();
        result.put("inbox", inbox.stream().map(this::mapMessage).collect(Collectors.toList()));
        result.put("sent", sent.stream().map(this::mapMessage).collect(Collectors.toList()));
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> payload, @RequestHeader("X-User-Email") String userEmail) {
        User sender = userRepository.findByEmail(userEmail).orElseThrow();
        User receiver = userRepository.findById(Long.parseLong(payload.get("receiverId").toString())).orElseThrow();

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(payload.get("content").toString());
        messageRepository.save(message);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        Message msg = messageRepository.findById(id).orElseThrow();
        msg.setRead(true);
        messageRepository.save(msg);
        return ResponseEntity.ok().build();
    }

    private Map<String, Object> mapMessage(Message m) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", m.getId());
        map.put("senderId", m.getSender().getId());
        map.put("senderName", m.getSender().getName());
        map.put("receiverId", m.getReceiver().getId());
        map.put("receiverName", m.getReceiver().getName());
        map.put("content", m.getContent());
        map.put("timestamp", m.getTimestamp().toString());
        map.put("read", m.isRead());
        return map;
    }
}
