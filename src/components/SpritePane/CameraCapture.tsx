import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Button, Typography, IconButton, Paper } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import RefreshIcon from '@mui/icons-material/Refresh';

interface CameraCaptureProps {
    onImageCaptured: (file: File, imageDataUrl: string) => void;
    onClose?: () => void;
    showStartButton?: boolean;
    buttonSize?: number;
}

export function CameraCapture({ 
    onImageCaptured, 
    onClose, 
    showStartButton = true,
    buttonSize = 80 
}: CameraCaptureProps) {
    // Camera-related state
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    
    // Refs for camera functionality
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Effect to handle setting up video stream when camera is shown
    useEffect(() => {
        if (cameraStream && videoRef.current && showCamera) {
            
            videoRef.current.srcObject = cameraStream;
            
            // Explicitly play the video to ensure it starts
            videoRef.current.play().catch(playError => {
                console.error('Error playing video:', playError);
            });
        }
    }, [cameraStream, showCamera]);

    const startCamera = useCallback(async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } 
            });
            setCameraStream(stream);
            setShowCamera(true);

        } catch (err) {
            console.error('Error accessing camera:', err);
            setCameraError('Could not access camera. Please check permissions.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
        setCameraError(null);
        if (onClose) {
            onClose();
        }
    }, [cameraStream, onClose]);

    const capturePhoto = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            if (context) {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Draw the video frame to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Get the image data as base64
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedImage(imageDataUrl);
                
                // Convert to File object for compatibility with existing upload flow
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { 
                            type: 'image/jpeg' 
                        });
                        onImageCaptured(file, imageDataUrl);
                    }
                }, 'image/jpeg', 0.8);
                
                stopCamera();
            }
        }
    }, [stopCamera, onImageCaptured]);

    const retakePhoto = useCallback(() => {
        setCapturedImage(null);
        startCamera();
    }, [startCamera]);

    // If showing the start button
    if (showStartButton && !showCamera && !capturedImage) {
        return (
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>
                    Or take a photo with your camera:
                </Typography>
                <IconButton
                    onClick={startCamera}
                    sx={{
                        width: buttonSize,
                        height: buttonSize,
                        backgroundColor: 'white',
                        color: 'primary.main',
                        border: '3px solid',
                        borderColor: 'primary.main',
                        '&:hover': {
                            backgroundColor: 'grey.100',
                        },
                        mb: 1
                    }}
                >
                    <CameraAltIcon sx={{ fontSize: buttonSize / 2 }} />
                </IconButton>
                {cameraError && (
                    <Typography color="error" variant="body2">
                        {cameraError}
                    </Typography>
                )}
            </Box>
        );
    }

    // Camera view
    if (showCamera) {
        return (
            <Paper sx={{ p: 2, mb: 2, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                    Camera
                </Typography>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        onLoadedMetadata={() => {
                            // Ensure video plays when metadata is loaded
                            if (videoRef.current) {
                                videoRef.current.play().catch(console.error);
                            }
                        }}
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            height: 'auto',
                            borderRadius: '8px'
                        }}
                    />
                </Box>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                    {/* White circle capture button */}
                    <IconButton
                        onClick={capturePhoto}
                        sx={{
                            width: 70,
                            height: 70,
                            backgroundColor: 'white',
                            border: '4px solid #1976d2',
                            '&:hover': {
                                backgroundColor: 'grey.100',
                            },
                        }}
                    >
                        <PhotoCameraIcon sx={{ fontSize: 30, color: '#1976d2' }} />
                    </IconButton>
                </Box>
                
                {/* Hidden canvas for image capture */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </Paper>
        );
    }

    // Show retake option if image was captured
    if (capturedImage) {
        return (
            <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Button
                    startIcon={<RefreshIcon />}
                    onClick={retakePhoto}
                    variant="outlined"
                    size="small"
                >
                    Retake Photo
                </Button>
            </Box>
        );
    }

    return null;
} 