package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.SharedRecord;
import com.healthbridge.healthbridgebackend.repository.SharedRecordRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SharedRecordService {

    private final SharedRecordRepository sharedRecordRepository;

    public SharedRecordService(SharedRecordRepository sharedRecordRepository) {
        this.sharedRecordRepository = sharedRecordRepository;
    }

    public SharedRecord saveSharedRecord(SharedRecord sharedRecord) {
        return sharedRecordRepository.save(sharedRecord);
    }

    public Optional<SharedRecord> findById(Long id) {
        return sharedRecordRepository.findById(id);
    }

    public List<SharedRecord> findBySharingSessionId(Long sharingSessionId) {
        return sharedRecordRepository.findBySharingSessionId(sharingSessionId);
    }

    public void deleteSharedRecord(Long id) {
        sharedRecordRepository.deleteById(id);
    }
}