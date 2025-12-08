import React, { useState } from 'react';
import { Box, Button, Typography, CircularProgress, Stepper, Step, StepLabel } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAddSprite } from "./onAddSpriteHandler";
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
import { addImageToSprite, setDisplayImage, StateImageDisplay } from '../ImageDisplay';
import { CameraCapture } from './CameraCapture';
import { ImageCropper } from './ImageCropper';

interface SnapbotUploaderProps {
    onClose: () => void;
}

// Define the server response type
interface ServerResponse {
    status: string;
    code?: string;
    costumes?: string[];
    sounds?: string[];
    name?: string;
    global_vars?: Record<string, any>;
    diagram_images?: Record<string, string>; // Map of state names to base64 images
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
    
    const { onAddSprite, setSnapbotSpriteCode } = useAddSprite();
    const patchVM = usePatchStore((state) => state.patchVM);
    const targetIds = usePatchStore((state) => state.targetIds);
    const globalVariables = usePatchStore((state) => state.globalVariables);
    const setProjectChanged = usePatchStore((state) => state.setProjectChanged);
    const setGlobalVariable = usePatchStore((state) => state.setGlobalVariable);
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
                    let serverResponse: ServerResponse | null = null;
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

                    // Create a global variable for the current state
                    const strippedTargetId = newTargetId.replace(/[^a-zA-Z0-9]/g, '');
                    const stateVarName = `curr_state_${strippedTargetId}`;
                    // Set default state to "start" or first state from diagram if available
                    let startingState = "start";
                    if (serverResponse && 
                        serverResponse.status === 'success' && 
                        serverResponse.diagram_images && 
                        Object.keys(serverResponse.diagram_images).length > 0) {
                        startingState = Object.keys(serverResponse.diagram_images)[0];
                    }
                    // Create the global variable
                    patchVM.updateGlobalVariable(stateVarName, startingState);
                    usePatchStore.getState().setGlobalVariable(stateVarName, startingState);

                    let generatedCode = '';
    
                    // Use the generated code or fallback to the default
                    if (serverResponse && serverResponse.status === 'success' && serverResponse.code) {
                        const parsedCode = parseCodeFromResponse(serverResponse.code);
                        if (parsedCode) {
                            generatedCode = parsedCode;
                        }
                    }

                    // Process diagram images if available
                    if (serverResponse && 
                        serverResponse.status === 'success' && 
                        serverResponse.diagram_images && 
                        Object.keys(serverResponse.diagram_images).length > 0) {
                        
                        setProcessingStatus('Processing diagram images...');
                        
                        // Add all images to the image display for the new sprite
                        const stateNames = Object.keys(serverResponse.diagram_images);
                        stateNames.forEach(stateName => {
                            // Check if the image is already a data URL or needs the prefix
                            let base64Image = serverResponse?.diagram_images![stateName] || "";
                            if (!base64Image.startsWith('data:')) {
                                base64Image = "data:image/png;base64," + base64Image;
                            }
                            
                            if (base64Image) {
                                // Use addImageToSprite to ensure the images are associated with the correct target
                                addImageToSprite(newTargetId, stateName, base64Image);
                            }
                        });
                        
                        // Set the first image as the currently displayed one
                        if (stateNames.length > 0) {
                            const firstStateName = stateNames[0];
                            
                            // Pass both targetId and imageKey to setDisplayImage
                            setDisplayImage(newTargetId, firstStateName);
                            
                            // We've added state-images that can now be displayed 
                            // by the StateImageDisplay component automatically.
                            // The StateImageDisplay component will look up the current
                            // state in the global variables and display the corresponding image.
                            
                            console.log(`Added ${stateNames.length} state images for sprite ${newTargetId}`);
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
                        
                        // Add global variables from server response if available
                        if (serverResponse.global_vars) {
                            setProcessingStatus('Adding global variables...');
                            Object.entries(serverResponse.global_vars).forEach(([name, value]) => {
                                patchVM.updateGlobalVariable(name, value);
                                usePatchStore.getState().setGlobalVariable(name, value as string | number | boolean);
                            });
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

                        //  move the sprite to a random position in the middle of the stage on play
                        patchVM.editingTarget.x = Math.random() * 200 - 100;
                        patchVM.editingTarget.y = Math.random() * 200 - 100;
                    }
                    
                    setProjectChanged(true);
                    // onClose();
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