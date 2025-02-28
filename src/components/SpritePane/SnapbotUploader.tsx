import React, { useState } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAddSprite } from "./onAddSpriteHandler";
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { snapbotStorage } from '../../lib/snapbotFirebase';

interface SnapbotUploaderProps {
    onClose: () => void;
}

export function SnapbotUploader({ onClose }: SnapbotUploaderProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { onAddSprite, setSnapbotSpriteCode } = useAddSprite();

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

        const storageRef = ref(snapbotStorage, `uploads/${Date.now()}_${selectedFile.name}`);
        
        await uploadBytes(storageRef, selectedFile);
        const downloadURL = await getDownloadURL(storageRef);
        
        console.log('File uploaded successfully:', downloadURL);

        

        try {
            const newTargetId = await onAddSprite();
            
            if (newTargetId) {
                // For now, just log that code was generated
                console.log("Code generated for Snapbot sprite: turnLeft(10)");

                const code = `turnLeft(10) \nsay("${downloadURL}")`;

                
                
                // Here you would actually process the image and generate code
                // Then update the sprite's code with the generated code

                await setSnapbotSpriteCode(newTargetId, code);
                
                onClose();
            }
        } catch (error) {
            console.error('Error creating Snapbot sprite:', error);
            setError('Failed to create Snapbot sprite. Please try again.');
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
            
            <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ marginBottom: '15px' }}
            />

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

            <Button
                variant="contained"
                color="primary"
                onClick={handleCreateSnapbotSprite}
                disabled={!selectedFile || uploading}
                sx={{ mt: 2 }}
            >
                {uploading ? (
                    <>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        Creating...
                    </>
                ) : (
                    'Create Snapbot Sprite'
                )}
            </Button>

            {error && (
                <Typography color="error" sx={{ mt: 2 }}>
                    {error}
                </Typography>
            )}
        </Box>
    );
} 