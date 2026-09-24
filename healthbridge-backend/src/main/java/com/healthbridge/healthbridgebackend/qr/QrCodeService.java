package com.healthbridge.healthbridgebackend.qr;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class QrCodeService {

    public byte[] generateQrCode(
            String content,
            int width,
            int height) {

        Map<EncodeHintType, Object> hints =
                new HashMap<>();

        hints.put(
                EncodeHintType.MARGIN,
                1
        );

        try {

            BitMatrix bitMatrix =
                    new MultiFormatWriter().encode(
                            content,
                            BarcodeFormat.QR_CODE,
                            width,
                            height,
                            hints
                    );

            ByteArrayOutputStream outputStream =
                    new ByteArrayOutputStream();

            MatrixToImageWriter.writeToStream(
                    bitMatrix,
                    "PNG",
                    outputStream
            );

            return outputStream.toByteArray();

        } catch (WriterException | IOException e) {

            throw new IllegalStateException(
                    "Failed to generate QR code",
                    e
            );
        }
    }
}