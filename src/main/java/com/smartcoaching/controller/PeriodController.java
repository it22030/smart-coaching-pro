package com.smartcoaching.controller;

import com.smartcoaching.entity.Period;
import com.smartcoaching.repository.PeriodRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/periods")
public class PeriodController {

    private final PeriodRepository periodRepository;

    public PeriodController(PeriodRepository periodRepository) {
        this.periodRepository = periodRepository;
    }

    @GetMapping
    public ResponseEntity<List<Period>> getAllPeriods() {
        return ResponseEntity.ok(periodRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Period> createPeriod(@RequestBody Period period) {
        return ResponseEntity.ok(periodRepository.save(period));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletePeriod(@PathVariable Long id) {
        periodRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
