import React, { useState, useCallback, useEffect } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { Box, Button, Typography, Slider, Stack, Paper, CircularProgress } from '@mui/material';
import CropIcon from '@mui/icons-material/Crop';
import CheckIcon from '@mui/icons-material/Check';
import RefreshIcon from '@mui/icons-material/Refresh';
import { detectPaper, createCroppedImage, CropArea } from '../../lib/paperDetection';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedFile: File, croppedDataUrl: string) => void;
    onCancel: () => void;
}

/**
 * Convert percentage-based crop area to react-easy-crop format
 * 
 * react-easy-crop uses:
 * - crop.x/y: pixel offset of image from center (positive = image moved right/down)
 * - zoom: scale factor for the image
 */
function cropAreaToEasyCrop(cropArea: CropArea, imageWidth: number, imageHeight: number): {
    crop: Point;
    zoom: number;
} {
    // Calculate the center of the detected crop area (as fractions 0-1)
    const cropCenterXFrac = (cropArea.x + cropArea.width / 2) / 100;
    const cropCenterYFrac = (cropArea.y + cropArea.height / 2) / 100;

    console.log('cropCenterXFrac', cropCenterXFrac);
    console.log('cropCenterYFrac', cropCenterYFrac);
    
    // Calculate how much the crop covers of the image (as fractions 0-1)
    const coverageX = cropArea.width / 100;
    const coverageY = cropArea.height / 100;
    
    // Zoom is inversely proportional to coverage (smaller area = higher zoom)
    const zoom = Math.max(1, Math.min(3, 1 / Math.max(coverageX, coverageY)));
    
    // react-easy-crop's crop coordinates are in the zoomed/displayed space,
    // so we need to multiply by zoom to correctly position the crop box
    const crop = {
        x: (0.5 - cropCenterXFrac) * imageWidth / zoom,
        y: (0.5 - cropCenterYFrac) * imageHeight / zoom
    };

    console.log('crop', crop, 'zoom', zoom);
    
    return { crop, zoom };
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isDetecting, setIsDetecting] = useState(true);
    const [detectionMessage, setDetectionMessage] = useState('Detecting paper...');
    const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

    // Run paper detection on mount
    useEffect(() => {
        let cancelled = false;

        async function runDetection() {
            setIsDetecting(true);
            setDetectionMessage('Detecting paper...');
            
            try {
                // Get image dimensions first
                const img = new Image();
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject();
                    img.src = imageSrc;
                });
                
                if (cancelled) return;
                
                setImageSize({ width: img.width, height: img.height });
                
                const result = await detectPaper(imageSrc);
                
                if (cancelled) return;
                
                if (result.detected && result.confidence > 0.1) {
                    setDetectionMessage('Paper detected! Adjust if needed.');
                    // Apply detected crop
                    const { crop: detectedCrop, zoom: detectedZoom } = cropAreaToEasyCrop(
                        result.cropArea,
                        img.width,
                        img.height
                    );
                    setCrop(detectedCrop);
                    setZoom(detectedZoom);
                } else {
                    setDetectionMessage('Could not detect paper. Please crop manually.');
                }
            } catch (error) {
                console.error('Detection error:', error);
                if (!cancelled) {
                    setDetectionMessage('Detection failed. Please crop manually.');
                }
            } finally {
                if (!cancelled) {
                    setIsDetecting(false);
                }
            }
        }

        runDetection();

        return () => {
            cancelled = true;
        };
    }, [imageSrc]);

    const onCropChange = useCallback((location: Point) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const onCropAreaChange = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirmCrop = useCallback(async () => {
        if (!croppedAreaPixels || !imageSize) return;

        try {
            // Convert pixels to percentage for our createCroppedImage function
            const cropArea: CropArea = {
                x: (croppedAreaPixels.x / imageSize.width) * 100,
                y: (croppedAreaPixels.y / imageSize.height) * 100,
                width: (croppedAreaPixels.width / imageSize.width) * 100,
                height: (croppedAreaPixels.height / imageSize.height) * 100
            };

            const { dataUrl, file } = await createCroppedImage(imageSrc, cropArea);
            onCropComplete(file, dataUrl);
        } catch (error) {
            console.error('Failed to create cropped image:', error);
        }
    }, [croppedAreaPixels, imageSize, imageSrc, onCropComplete]);

    const handleResetCrop = useCallback(() => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    }, []);

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CropIcon /> Crop Your Image
            </Typography>

            {isDetecting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} sx={{ mr: 2 }} />
                    <Typography>{detectionMessage}</Typography>
                </Box>
            ) : (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {detectionMessage} Drag to pan, use slider or scroll to zoom.
                    </Typography>

                    {/* Cropper container */}
                    <Box
                        sx={{
                            position: 'relative',
                            width: '100%',
                            height: 300,
                            backgroundColor: '#333',
                            borderRadius: 1,
                            overflow: 'hidden',
                            mb: 2
                        }}
                    >
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={undefined} // Free aspect ratio
                            onCropChange={onCropChange}
                            onZoomChange={onZoomChange}
                            onCropComplete={onCropAreaChange}
                            minZoom={0.5}
                            maxZoom={3}
                            zoomSpeed={0.1}
                            restrictPosition={false}
                        />
                    </Box>

                    {/* Zoom slider */}
                    <Box sx={{ px: 2, mb: 2 }}>
                        <Typography variant="body2" gutterBottom>
                            Zoom
                        </Typography>
                        <Slider
                            value={zoom}
                            min={0.5}
                            max={3}
                            step={0.1}
                            onChange={(_, value) => setZoom(value as number)}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                        />
                    </Box>

                    {/* Action buttons */}
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={handleResetCrop}
                        >
                            Reset
                        </Button>
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<CheckIcon />}
                            onClick={handleConfirmCrop}
                            disabled={!croppedAreaPixels}
                        >
                            Confirm Crop
                        </Button>
                    </Stack>
                </>
            )}
        </Paper>
    );
}

