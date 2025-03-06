import React, { useState } from 'react';
import { Box, Button, Typography, CircularProgress, Stepper, Step, StepLabel } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAddSprite } from "./onAddSpriteHandler";
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { snapbotStorage } from '../../lib/snapbotFirebase';
import { 
    sendImageForProcessing, 
    parseCodeFromResponse, 
    convertFileToBase64 
} from '../../lib/snapbotModalService';

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
    const { onAddSprite, setSnapbotSpriteCode } = useAddSprite();

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

            setSelectedFile(file);
            setImagePreview(URL.createObjectURL(file));
            setError(null);
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

        const storageRef = ref(snapbotStorage, `uploads/${Date.now()}_${selectedFile.name}`);
        
        await uploadBytes(storageRef, selectedFile);
        const downloadURL = await getDownloadURL(storageRef);
        
        console.log('File uploaded successfully:', downloadURL);

        try {
            setProcessingStatus('Creating new sprite...');
            const newTargetId = await onAddSprite();
            
            if (newTargetId) {
                // Default code in case generation fails
                const defaultCode = `turnLeft(10) \nsay("${downloadURL}")`;

                // Convert the image file to base64
                setProcessingStatus('Converting image for processing...');
                const base64Image = await convertFileToBase64(selectedFile);

                // Step 1: Send the image to the generation endpoint
                setActiveStep(2);
                setProcessingStatus('Sending image to Modal server for processing...');
                try {
                    let generatedCode = await sendImageForProcessing(base64Image, newTargetId);
    
                    // Use the generated code or fallback to the default
                    if (generatedCode && generatedCode.status === 'success') {
                        const parsedCode = parseCodeFromResponse(generatedCode);
                        if (parsedCode) {
                            generatedCode = parsedCode;
                        }
                    }

                    // Step 3: Set the code for the Snapbot sprite
                    setActiveStep(3);
                    setProcessingStatus('Applying generated code to sprite...');
                    await setSnapbotSpriteCode(newTargetId, generatedCode);
                    
                    onClose();
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
                Upload an image to create a sprite with generated code.
            </Typography>
            
            {!uploading && (
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ marginBottom: '15px' }}
                />
            )}

            {imagePreview && (
                <Box sx={{ my: 2 }}>
                    <img 
                        src={imagePreview} 
                        alt="Preview" 
                        style={{ 
                            maxWidth: '100%', 
                            maxHeight: '300px',
                            objectFit: 'contain'
                        }} 
                    />
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

            {!uploading && (
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