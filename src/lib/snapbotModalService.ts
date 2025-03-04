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
    const response = await fetch(`/api/modal/generation`, {
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
 * Retrieves the generated code for a given generation ID
 * @param generationId The ID of the generation
 * @returns The generated code
 */
export async function retrieveGeneratedCode(generationId: string) {
    // Use the API route which works in both development and production
    const response = await fetch(`/api/modal/retrieve-code?generation_id=${generationId}`, {
        method: 'GET',
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Code retrieval failed with status: ${response.status}. Details: ${errorText}`);
    }

    const result = await response.json();
    if (result.status === 'failure') {
        throw new Error(`Code retrieval failed: ${result.error}`);
    }

    return result;
}

/**
 * Retrieves the available function names for a given generation ID
 * @param generationId The ID of the generation
 * @returns The list of available function names
 */
export async function retrieveFunctionNames(generationId: string) {
    // Use the API route which works in both development and production
    const response = await fetch(`/api/modal/retrieve-names?generation_id=${generationId}`, {
        method: 'GET',
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Names retrieval failed with status: ${response.status}. Details: ${errorText}`);
    }

    const result = await response.json();
    if (result.status === 'failure') {
        throw new Error(`Names retrieval failed: ${result.error}`);
    }

    return result.names || [];
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

    // Handle different response formats
    if (typeof codeResult.code === 'string') {
        return codeResult.code;
    }

    // If code is an object with a 'code' property
    if (typeof codeResult.code === 'object' && codeResult.code.code) {
        return codeResult.code.code;
    }

    // If code is an object with a 'to_dict' method result
    if (typeof codeResult.code === 'object' && codeResult.code.context) {
        // This is likely the result of the to_dict() method in the Python code
        // We need to extract the actual code from the context
        try {
            // Join all the code snippets from the context
            const codeSnippets = Object.values(codeResult.code.context || {});
            if (Array.isArray(codeSnippets) && codeSnippets.length > 0) {
                return codeSnippets.join('\n');
            }
        } catch (e) {
            console.error('Error parsing code from context:', e);
        }
    }

    // Fallback: stringify the entire code object
    try {
        return JSON.stringify(codeResult.code);
    } catch (e) {
        console.error('Error stringifying code:', e);
        return '';
    }
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