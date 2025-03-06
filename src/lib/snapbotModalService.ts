/**
 * Utility functions for interacting with the Snapbot Modal server
 */

/**
 * Sends an image to the Modal server for processing
 * @param base64Image Base64-encoded image data (without the data URL prefix)
 * @param generationId Unique ID for this generation
 * @returns The response from the server
 */
export async function sendImageForProcessing(base64Image: string, generationId: string) {
    // Use the API route which works in both development and production
    const response = await fetch(`/api/modal/generation.js`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: base64Image,
            generation_id: generationId,
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
 * @param codeResult The response from the Modal server
 * @returns The parsed code as a string
 */
export function parseCodeFromResponse(codeResult: any): string {
    if (!codeResult || !codeResult.code) {
        return '';
    }

    let generatedCode = '';

    // If code is an object with a 'to_dict' method result
    if (typeof codeResult.code === 'object' && codeResult.code.context && 
        codeResult.code.primitives && codeResult.code.game_loop) {
        // This is likely the result of the to_dict() method in the Python code
        // We need to extract the actual code from the context
        try {
            // Extract primitives
            generatedCode += "### Primitives ###\n\n";
            for (const primitive of codeResult.code.primitives) {
                generatedCode += primitive + "\n\n";
            }

            generatedCode += "### Generated Code ###\n\n";
            // Join all the code snippets from the context
            const codeSnippets = Object.values(codeResult.code.context || {});
            if (Array.isArray(codeSnippets) && codeSnippets.length > 0) {
                generatedCode += codeSnippets.join('\n');
            }

            generatedCode += "\n\n### Game Loop ###\n\n";
            // Add the game loop code
            generatedCode += codeResult.code.game_loop;
        } catch (e) {
            console.error('Error parsing code from context:', e);
        }
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