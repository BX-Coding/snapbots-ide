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
import usePatchStore from '../../store';
import { sprites } from "../../assets/sprites";
import { sounds } from "../../assets/sounds";
import { useCostumeHandlers } from "../../hooks/useCostumeUploadHandlers";
import { useSoundHandlers } from "../../hooks/useSoundUploadHandlers";
import { useEditingTarget } from "../../hooks/useEditingTarget";
import { get } from 'http';

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
    const patchVM = usePatchStore((state) => state.patchVM);
    const targetIds = usePatchStore((state) => state.targetIds);
    const globalVariables = usePatchStore((state) => state.globalVariables);
    const setProjectChanged = usePatchStore((state) => state.setProjectChanged);
    const { handleAddSoundToEditingTarget } = useSoundHandlers();
    const { handleAddCostumesToEditingTarget } = useCostumeHandlers();
    const setCostumes = usePatchStore((state) => state.setCostumes);
    const setSelectedCostumeIndex = usePatchStore((state) => state.setSelectedCostumeIndex);
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
                    let serverResponse = null;
                    if (!TESTING_MODE) {
                        serverResponse = await sendImageForProcessing(
                            base64Image, 
                            spriteNames,
                            globalVarsMap
                        );
                    } else {
                        serverResponse = {
                            status: 'success',
                            code: 'turnLeft(10) \nsay("${downloadURL}")',
                            costumes: ['elephant-a', 'elephant-b'],
                            sounds: ['C2 Bass'],
                            name: 'Snapbot Sprite',
                        };
                    }

                    console.log(serverResponse);

                    let generatedCode = '';
    
                    // Use the generated code or fallback to the default
                    if (serverResponse && serverResponse.status === 'success' && serverResponse.code) {
                        const parsedCode = parseCodeFromResponse(serverResponse.code);
                        if (parsedCode) {
                            generatedCode = parsedCode;
                        }
                    }

                    // Set the code for the Snapbot sprite
                    setActiveStep(3);
                    setProcessingStatus('Applying generated code to sprite...');
                    await setSnapbotSpriteCode(newTargetId, generatedCode);

                    // Set the sprite name from the payload if available
                    if (serverResponse && serverResponse.status === 'success') {
                        // Set the sprite name if available
                        if (serverResponse.name) {
                            setProcessingStatus('Setting sprite name...');
                            patchVM.renameSprite(newTargetId, serverResponse.name);
                        }
                        
                        // Add costumes if available
                        if (serverResponse.costumes && serverResponse.costumes.length > 0) {
                            setProcessingStatus('Adding costumes to sprite...');
                            
                            // Create an array of promises for adding costumes
                            const costumePromises = [];
                            
                            for (const costumeName of serverResponse.costumes) {
                                try {
                                    console.log(`Adding costume: ${costumeName}`);
                                    // Find the costume in the built-in sprites
                                    const costumeAsset = sprites.find(sprite => 
                                        sprite.costumes.some(costume => costume.name === costumeName)
                                    )?.costumes.find(costume => costume.name === costumeName);
                                    
                                    if (costumeAsset) {
                                        console.log(`Found costume ${costumeName} in library`);
                                        // Add to promises instead of awaiting immediately
                                        costumePromises.push(handleAddCostumesToEditingTarget([costumeAsset], true));
                                    } else {
                                        console.error(`Costume not found: ${costumeName}`);
                                    }
                                } catch (error) {
                                    console.error(`Failed to add costume ${costumeName}:`, error);
                                }
                            }
                            
                            setSelectedCostumeIndex(patchVM.editingTarget.currentCostume);
                            // remove the first costume from the editing target
                            patchVM.editingTarget.sprite.costumes.splice(0, 1);
                            console.log("Editing target costumes after operations:", patchVM.editingTarget.sprite.costumes);

                        }
                        
                        // Add sounds if available
                        if (serverResponse.sounds && serverResponse.sounds.length > 0) {
                            setProcessingStatus('Adding sounds to sprite...');
                            
                            for (const soundName of serverResponse.sounds) {
                                try {
                                    console.log(`Adding sound: ${soundName}`);
                                    // Find the sound in the built-in sounds
                                    const soundAsset = sounds.find(sound => sound.name === soundName);
                                    
                                    if (soundAsset) {
                                        console.log(`Found sound ${soundName} in library`);
                                        await handleAddSoundToEditingTarget(soundAsset, true);
                                    } else {
                                        console.error(`Sound not found: ${soundName}`);
                                    }
                                } catch (error) {
                                    console.error(`Failed to add sound ${soundName}:`, error);
                                }
                            }
                        }
                    }
                    
                    setProjectChanged(true);
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