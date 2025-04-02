/**
 * Utility functions for interacting with the Snapbot Modal server
 */

import { randomBytes } from "crypto";

/**
 * Sends an image to the Modal server for processing
 * @param base64Image Base64-encoded image data (without the data URL prefix)
 * @param characters Optional list of character names
 * @param globalVars Optional dictionary of global variables
 * @returns The response from the server
 */
export async function sendImageForProcessing(
    base64Image: string, 
    characters: string[] = [], 
    globalVars: Record<string, any> = { current_message: "none" }
) {
    // Generate integer UUID for the diagram
    const uuid = Math.floor(Math.random() * 10000000000000000);

    // print out the body
    console.log(JSON.stringify({
        image: base64Image,
        uuid: uuid,
        characters: characters,
        global_vars: globalVars
    }));

    // Use the API route which works in both development and production
    const response = await fetch(`/api/modal/generation.js`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: base64Image,
            uuid: uuid,
            characters: characters,
            global_vars: globalVars
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Generation request failed with status: ${response.status}. Details: ${errorText}`);
    }

    const result = await response.json();

    if (result.status === 'failure') {
        throw new Error(`Generation failed: ${result.error}`);
    }

    return result;
}

/**
 * Parses the code from the Modal server response
 * @param codeObj The code response from the Modal server
 * @returns The parsed code as a string
 */
export function parseCodeFromResponse(codeObj: any): string {
    if (!codeObj) {
        return '';
    }

    let generatedCode = ''; 
    
    // Process primitives
    if (Array.isArray(codeObj.primitives) || typeof codeObj.primitives === 'object') {
        generatedCode += "### Primitives ###\n\n";
        const primitives = Array.isArray(codeObj.primitives) 
            ? codeObj.primitives 
            : Object.values(codeObj.primitives);
            
        for (const primitive of primitives) {
            generatedCode += primitive + "\n\n";
        }
    }

    // Process context (state functions)
    if (codeObj.context) {
        generatedCode += "### Generated Code ###\n\n";
        const contextCode = typeof codeObj.context === 'object' 
            ? Object.values(codeObj.context) 
            : [codeObj.context];
            
        generatedCode += contextCode.join('\n\n');
    }

    // Process game loop
    if (codeObj.game_loop) {
        generatedCode += "\n\n### Game Loop ###\n\n";
        const gameLoopCode = typeof codeObj.game_loop === 'object' 
            ? Object.values(codeObj.game_loop)[0] 
            : codeObj.game_loop;

        generatedCode += gameLoopCode;

        // call game_loop() at the end of the code
        generatedCode += "\n\ngame_loop()\n";
    }

    return generatedCode;
}

/**
 * Converts a file to base64
 * @param file The file to convert
 * @returns A Promise that resolves to the base64-encoded file data
 */
export function convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64Data = base64String.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = error => reject(error);
    });
} 