import React, { useState } from 'react';
import { Box, Button, Typography, CircularProgress, Stepper, Step, StepLabel } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
    sendImageForProcessing,
    convertFileToBase64
} from '../../lib/snapbotModalService';
import {
    applySnapbotResponse,
    useApplySnapbotResponseDeps,
    SnapbotServerResponse,
} from '../../lib/applySnapbotResponse';
import usePatchStore from '../../store';
import { CameraCapture } from './CameraCapture';
import { ImageCropper } from './ImageCropper';

interface SnapbotUploaderProps {
    onClose: () => void;
}


export function SnapbotUploader({ onClose }: SnapbotUploaderProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [processingStatus, setProcessingStatus] = useState('');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    // Cropping state
    const [showCropper, setShowCropper] = useState(false);
    const [originalImage, setOriginalImage] = useState<string | null>(null); // Uncropped image for cropper
    const [isCropped, setIsCropped] = useState(false); // Track if image has been cropped
    
    const applyDeps = useApplySnapbotResponseDeps();
    const { onAddSprite, patchVM, setSnapbotSpriteCode } = applyDeps;
    const targetIds = usePatchStore((state) => state.targetIds);
    const globalVariables = usePatchStore((state) => state.globalVariables);

    // Steps for the stepper
    const steps = ['Upload Image', 'Process Image', 'Generate Code', 'Create Sprite'];

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                setSelectedFile(null);
                setImagePreview(null);
                return;
            }

            // Store original and show cropper
            const imageUrl = URL.createObjectURL(file);
            setOriginalImage(imageUrl);
            setShowCropper(true);
            setCapturedImage(null);
            setIsCropped(false);
            setError(null);
        }
    };

    const handleImageCaptured = (file: File, imageDataUrl: string) => {
        // Store original and show cropper
        setOriginalImage(imageDataUrl);
        setShowCropper(true);
        setCapturedImage(imageDataUrl);
        setIsCropped(false);
        setError(null);
    };

    const handleCropComplete = (croppedFile: File, croppedDataUrl: string) => {
        setSelectedFile(croppedFile);
        setImagePreview(croppedDataUrl);
        setShowCropper(false);
        setIsCropped(true);
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setOriginalImage(null);
        setCapturedImage(null);
    };

    const handleRecrop = () => {
        // Re-open the cropper with the original image
        if (originalImage) {
            setShowCropper(true);
        }
    };

    const handleCreateSnapbotSprite = async () => {
        if (!selectedFile) {
            setError('Please select an image first');
            return;
        }

        setUploading(true);
        setError(null);
        setActiveStep(1);
        setProcessingStatus('Uploading image to storage...');

        try {
            setProcessingStatus('Creating new sprite...');
            const newTargetId = await onAddSprite();

            // close the modal
            onClose();
            
            if (newTargetId) {
                // Default code in case generation fails
                const defaultCode = `turnLeft(10) \nsay("${selectedFile.name}")`;

                // Get all sprite names from the current project
                const spriteNames = targetIds
                    .map(id => patchVM.runtime.getTargetById(id))
                    .filter(target => target && target.isSprite() && !target.sprite.isStage)
                    .map(target => target.sprite.name);

                // Convert global variables to the expected format
                const globalVarsMap: Record<string, any> = { current_message: "none" };
                globalVariables.forEach(variable => {
                    globalVarsMap[variable.name] = variable.value;
                });

                // Convert the image file to base64
                setProcessingStatus('Converting image for processing...');
                const base64Image = await convertFileToBase64(selectedFile);

                // Send the image to the generation endpoint
                setActiveStep(2);
                const snapbotMode = localStorage.getItem("snapbotMode") || "simulation";
                setProcessingStatus(`Processing with ${snapbotMode} mode...`);

                const TESTING_MODE = false;

                try {
                    let serverResponse: SnapbotServerResponse;
                    if (!TESTING_MODE) {
                        serverResponse = await sendImageForProcessing(
                            base64Image,
                            newTargetId,
                            spriteNames,
                            globalVarsMap
                        );
                    } else {
                        serverResponse = {
                            status: 'success',
                            code: 'turnLeft(10) \nsay("${selectedFile.name}")',
                            costumes: ['elephant-a', 'elephant-b'],
                            sounds: ['C2 Bass'],
                            name: 'Snapbot Sprite',
                            global_vars: {
                                "test": 1,
                                "test2": "test2",
                            },
                            diagram_images: {
                                "state1": "data:image/png;base64,...",
                                "state2": "data:image/png;base64,..."
                            }
                        };
                    }

                    setActiveStep(3);
                    await applySnapbotResponse(serverResponse, newTargetId, applyDeps, {
                        onStatus: setProcessingStatus,
                    });
                } catch (error) {
                    console.error('Error with Modal server:', error);
                    // Fallback to default code if Modal server fails
                    setProcessingStatus('Using default code (Modal server error)...');
                    await setSnapbotSpriteCode(newTargetId, defaultCode);
                    onClose();
                }
            }
        } catch (error) {
            console.error('Error creating Snapbot sprite:', error);
            setError(`Failed to create Snapbot sprite: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box sx={{ p: 3, position: 'relative' }}>
            <Button 
                onClick={onClose}
                sx={{ position: 'absolute', right: 8, top: 8 }}
            >
                <CloseIcon />
            </Button>
            
            <Typography variant="h6" gutterBottom>
                Create Snapbot Sprite
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
                Upload an image or take a photo to create a sprite with generated code.
            </Typography>
            
            {/* Image Cropper */}
            {showCropper && originalImage && (
                <ImageCropper
                    imageSrc={originalImage}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}

            {!uploading && !showCropper && !imagePreview && (
                <Box sx={{ mb: 3 }}>
                    {/* File upload section */}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Upload from file:
                        </Typography>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ marginBottom: '10px' }}
                        />
                    </Box>

                    {/* Camera section */}
                    <CameraCapture onImageCaptured={handleImageCaptured} />
                </Box>
            )}

            {/* Image preview (after cropping) */}
            {imagePreview && !showCropper && (
                <Box sx={{ my: 2 }}>
                    <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
                        {isCropped ? '✓ Image cropped' : 'Preview:'}
                    </Typography>
                    <img 
                        src={imagePreview} 
                        alt="Preview" 
                        style={{ 
                            maxWidth: '100%', 
                            maxHeight: '300px',
                            objectFit: 'contain',
                            border: '2px solid #4caf50',
                            borderRadius: '8px'
                        }} 
                    />
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        {originalImage && (
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleRecrop}
                            >
                                Adjust Crop
                            </Button>
                        )}
                        {capturedImage && (
                            <CameraCapture 
                                onImageCaptured={handleImageCaptured}
                                showStartButton={false}
                            />
                        )}
                    </Box>
                </Box>
            )}

            {uploading && (
                <Box sx={{ width: '100%', my: 3 }}>
                    <Stepper activeStep={activeStep}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        <Typography>{processingStatus}</Typography>
                    </Box>
                </Box>
            )}

            {!uploading && !showCropper && (
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCreateSnapbotSprite}
                    disabled={!selectedFile || uploading}
                    sx={{ mt: 2 }}
                >
                    Create Snapbot Sprite
                </Button>
            )}

            {error && (
                <Typography color="error" sx={{ mt: 2 }}>
                    {error}
                </Typography>
            )}
        </Box>
    );
} 