package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.repository.MedicalDocumentRepository;
import com.healthbridge.healthbridgebackend.repository.MedicalRecordRepository;
import com.healthbridge.healthbridgebackend.repository.SharedRecordRepository;
import com.healthbridge.healthbridgebackend.service.MedicalRecordService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class MedicalRecordDeletionTest {
    private final MedicalRecordRepository records = mock(MedicalRecordRepository.class);
    private final MedicalDocumentRepository documents = mock(MedicalDocumentRepository.class);
    private final SharedRecordRepository shared = mock(SharedRecordRepository.class);
    private final MedicalRecordService service = new MedicalRecordService(records, documents, shared);

    @Test
    void attachedDocumentsPreventRecordDeletion() {
        when(documents.existsByMedicalRecordId(1L)).thenReturn(true);
        assertThrows(ResponseStatusException.class, () -> service.deleteRecord(1L));
        verify(records, never()).deleteById(any());
        verify(shared, never()).deleteByMedicalRecordId(any());
    }

    @Test
    void sharingLinksAreRemovedBeforeDeletingRecord() {
        service.deleteRecord(1L);
        var order = inOrder(shared, records);
        order.verify(shared).deleteByMedicalRecordId(1L);
        order.verify(records).deleteById(1L);
    }
}
