package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.MedicalDocumentResponse;
import com.healthbridge.healthbridgebackend.entity.MedicalDocument;
import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.security.CurrentUserService;
import com.healthbridge.healthbridgebackend.service.MedicalDocumentService;
import com.healthbridge.healthbridgebackend.service.MedicalRecordService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.InvalidPathException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/medical-documents")
public class MedicalDocumentController {

    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".pdf",
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
    );

    private final MedicalDocumentService medicalDocumentService;
    private final MedicalRecordService medicalRecordService;
    private final CurrentUserService currentUserService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public MedicalDocumentController(
            MedicalDocumentService medicalDocumentService,
            MedicalRecordService medicalRecordService,
            CurrentUserService currentUserService) {
        this.medicalDocumentService = medicalDocumentService;
        this.medicalRecordService = medicalRecordService;
        this.currentUserService = currentUserService;
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

        currentUserService.assertProfileOwner(medicalRecord.getHealthProfile());

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a non-empty medical report.");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Files must be no larger than 10 MB.");
        }

        String contentType = file.getContentType();

        if (contentType == null
                || !ALLOWED_CONTENT_TYPES.contains(
                contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a PDF, JPEG, PNG, or WebP report.");
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

            String cleanFileName = Paths.get(originalFileName.replace('\\', '/'))
                    .getFileName()
                    .toString();

            if (cleanFileName.length() > 180
                    || cleanFileName.chars().anyMatch(Character::isISOControl)) {
                return ResponseEntity.badRequest().build();
            }

            String extension = "";
            int dotIndex = cleanFileName.lastIndexOf('.');

            if (dotIndex >= 0) {
                extension = cleanFileName
                        .substring(dotIndex)
                        .toLowerCase(Locale.ROOT);
            }

            if (!ALLOWED_EXTENSIONS.contains(extension)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a PDF, JPEG, PNG, or WebP report.");
            }

            if (!matchesFileType(file, extension, contentType.toLowerCase(Locale.ROOT))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The report contents do not match its file type.");
            }

            String storedFileName =
                    UUID.randomUUID() + extension;

            Path filePath = uploadPath
                    .resolve(storedFileName)
                    .normalize();

            if (!filePath.startsWith(uploadPath)) {
                return ResponseEntity.badRequest().build();
            }

            try (InputStream input = file.getInputStream()) {
                Files.copy(input, filePath);
            }

            MedicalDocument document = new MedicalDocument();

            document.setMedicalRecord(medicalRecord);
            document.setFileName(cleanFileName);
            document.setFilePath(filePath.toString());
            document.setFileType(file.getContentType());

            MedicalDocument savedDocument;
            try {
                savedDocument = medicalDocumentService.saveDocument(document);
            } catch (RuntimeException exception) {
                Files.deleteIfExists(filePath);
                throw exception;
            }

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(toResponse(savedDocument));

        } catch (InvalidPathException e) {
            return ResponseEntity.badRequest().build();
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

        currentUserService.assertProfileOwner(medicalRecord.getHealthProfile());

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

        currentUserService.assertProfileOwner(
                document.getMedicalRecord().getHealthProfile()
        );

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
                            ContentDisposition.attachment()
                                    .filename(document.getFileName(), StandardCharsets.UTF_8)
                                    .build().toString()
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

        currentUserService.assertProfileOwner(
                document.getMedicalRecord().getHealthProfile()
        );

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

    private boolean matchesFileType(MultipartFile file, String extension, String contentType)
            throws IOException {
        byte[] header;
        try (InputStream input = file.getInputStream()) {
            header = input.readNBytes(12);
        }
        return switch (contentType) {
            case "application/pdf" -> extension.equals(".pdf")
                    && startsWith(header, new byte[]{37, 80, 68, 70, 45});
            case "image/jpeg" -> (extension.equals(".jpg") || extension.equals(".jpeg"))
                    && startsWith(header, new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff});
            case "image/png" -> extension.equals(".png")
                    && startsWith(header, new byte[]{(byte) 0x89, 80, 78, 71, 13, 10, 26, 10});
            case "image/webp" -> extension.equals(".webp") && header.length >= 12
                    && new String(header, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                    && new String(header, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
            default -> false;
        };
    }

    private boolean startsWith(byte[] header, byte[] signature) {
        if (header.length < signature.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if (header[index] != signature[index]) {
                return false;
            }
        }
        return true;
    }
}
