package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.controller.MedicalDocumentController;
import com.healthbridge.healthbridgebackend.entity.MedicalDocument;
import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.service.MedicalDocumentService;
import com.healthbridge.healthbridgebackend.service.MedicalRecordService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DocumentManagementTest {
    @TempDir
    Path uploads;
    private final MedicalDocumentService documents = mock(MedicalDocumentService.class);
    private final MedicalRecordService records = mock(MedicalRecordService.class);
    private final CurrentUserService currentUser = mock(CurrentUserService.class);
    private final MedicalDocumentController controller = new MedicalDocumentController(documents, records, currentUser);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(controller, "uploadDir", uploads.toString());
        when(records.findById(1L)).thenReturn(Optional.of(MedicalRecord.builder().id(1L).build()));
        when(documents.saveDocument(any())).thenAnswer(invocation -> {
            MedicalDocument document = invocation.getArgument(0);
            document.setId(2L);
            return document;
        });
    }

    @Test
    void acceptsPdfAndStoresGeneratedNameInsideUploadDirectory() throws Exception {
        var file = new MockMultipartFile("file", "../report.pdf", "application/pdf", "%PDF-1.7\nsynthetic".getBytes());
        var response = controller.uploadDocument(1L, file);
        assertEquals(201, response.getStatusCode().value());
        assertEquals("report.pdf", response.getBody().getFileName());
        try (var files = Files.list(uploads)) {
            var stored = files.toList();
            assertEquals(1, stored.size());
            assertFalse(stored.get(0).getFileName().toString().contains("report"));
        }
    }

    @Test
    void rejectsSpoofedPdfAndMismatchedExtension() {
        assertEquals(400, controller.uploadDocument(1L,
                new MockMultipartFile("file", "report.pdf", "application/pdf", "not a pdf".getBytes()))
                .getStatusCode().value());
        assertEquals(400, controller.uploadDocument(1L,
                new MockMultipartFile("file", "report.png", "application/pdf", "%PDF-1.7".getBytes()))
                .getStatusCode().value());
        verify(documents, never()).saveDocument(any());
    }

    @Test
    void failedMetadataSaveRemovesUploadedFile() throws Exception {
        doThrow(new IllegalStateException("Synthetic failure")).when(documents).saveDocument(any());
        assertThrows(IllegalStateException.class, () -> controller.uploadDocument(1L,
                new MockMultipartFile("file", "report.pdf", "application/pdf", "%PDF-1.7".getBytes())));
        try (var files = Files.list(uploads)) {
            assertEquals(0, files.count());
        }
    }

    @Test
    void downloadAndDeleteCannotEscapeStorageDirectory() {
        var document = MedicalDocument.builder().id(2L)
                .medicalRecord(MedicalRecord.builder().build())
                .filePath(uploads.resolve("../outside.pdf").toString()).build();
        when(documents.findById(2L)).thenReturn(Optional.of(document));
        assertEquals(403, controller.downloadDocument(2L).getStatusCode().value());
        assertEquals(403, controller.deleteDocument(2L).getStatusCode().value());
        verify(documents, never()).deleteDocument(any());
    }
}
