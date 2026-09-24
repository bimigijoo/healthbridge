package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.MedicalDocumentResponse;
import com.healthbridge.healthbridgebackend.entity.MedicalDocument;
import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.service.MedicalDocumentService;
import com.healthbridge.healthbridgebackend.service.MedicalRecordService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medical-documents")
public class MedicalDocumentController {

    private final MedicalDocumentService medicalDocumentService;
    private final MedicalRecordService medicalRecordService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public MedicalDocumentController(
            MedicalDocumentService medicalDocumentService,
            MedicalRecordService medicalRecordService) {
        this.medicalDocumentService = medicalDocumentService;
        this.medicalRecordService = medicalRecordService;
    }

    @PostMapping("/upload/{medicalRecordId}")
    public ResponseEntity<MedicalDocumentResponse> uploadDocument(
            @PathVariable Long medicalRecordId,
            @RequestParam("file") MultipartFile file) {

        MedicalRecord medicalRecord = medicalRecordService
                .findById(medicalRecordId)
                .orElse(null);

        if (medicalRecord == null) {
            return ResponseEntity.notFound().build();
        }

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            Path uploadPath = Paths.get(uploadDir)
                    .toAbsolutePath()
                    .normalize();

            Files.createDirectories(uploadPath);

            String originalFileName = file.getOriginalFilename();

            if (originalFileName == null || originalFileName.isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            String cleanFileName = Paths.get(originalFileName)
                    .getFileName()
                    .toString();

            String storedFileName =
                    UUID.randomUUID() + "_" + cleanFileName;

            Path filePath = uploadPath
                    .resolve(storedFileName)
                    .normalize();

            if (!filePath.startsWith(uploadPath)) {
                return ResponseEntity.badRequest().build();
            }

            Files.copy(file.getInputStream(), filePath);

            MedicalDocument document = new MedicalDocument();

            document.setMedicalRecord(medicalRecord);
            document.setFileName(cleanFileName);
            document.setFilePath(filePath.toString());
            document.setFileType(file.getContentType());

            MedicalDocument savedDocument =
                    medicalDocumentService.saveDocument(document);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(toResponse(savedDocument));

        } catch (IOException e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .build();
        }
    }

    @GetMapping("/record/{medicalRecordId}")
    public ResponseEntity<List<MedicalDocumentResponse>> getDocumentsByRecord(
            @PathVariable Long medicalRecordId) {

        MedicalRecord medicalRecord = medicalRecordService
                .findById(medicalRecordId)
                .orElse(null);

        if (medicalRecord == null) {
            return ResponseEntity.notFound().build();
        }

        List<MedicalDocumentResponse> responses =
                medicalDocumentService
                        .findByMedicalRecordId(medicalRecordId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable Long id) {

        MedicalDocument document = medicalDocumentService
                .findById(id)
                .orElse(null);

        if (document == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path filePath = Paths.get(document.getFilePath())
                    .toAbsolutePath()
                    .normalize();

            Path uploadPath = Paths.get(uploadDir)
                    .toAbsolutePath()
                    .normalize();

            if (!filePath.startsWith(uploadPath)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = document.getFileType();

            if (contentType == null || contentType.isBlank()) {
                contentType = Files.probeContentType(filePath);
            }

            if (contentType == null || contentType.isBlank()) {
                contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" +
                                    document.getFileName() + "\""
                    )
                    .body(resource);

        } catch (IOException e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable Long id) {

        MedicalDocument document = medicalDocumentService
                .findById(id)
                .orElse(null);

        if (document == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path filePath = Paths.get(document.getFilePath())
                    .toAbsolutePath()
                    .normalize();

            Path uploadPath = Paths.get(uploadDir)
                    .toAbsolutePath()
                    .normalize();

            if (!filePath.startsWith(uploadPath)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Files.deleteIfExists(filePath);

            medicalDocumentService.deleteDocument(id);

            return ResponseEntity.noContent().build();

        } catch (IOException e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .build();
        }
    }

    private MedicalDocumentResponse toResponse(
            MedicalDocument document) {

        return new MedicalDocumentResponse(
                document.getId(),
                document.getMedicalRecord().getId(),
                document.getFileName(),
                document.getFileType(),
                document.getUploadedAt()
        );
    }
}