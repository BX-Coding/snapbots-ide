<script lang="ts">
    import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
    import { app } from '$lib/firebase/firebase';
    import { getAuth } from 'firebase/auth';

    let user = getAuth().currentUser;

    let { 
        imageUrl = $bindable('') 
    }: { 
        imageUrl: string
    } = $props();

    let selectedFile = $state<File | null>(null);
    let uploading = $state(false);
    let uploadError = $state<string | null>(null);
    let uploadSuccess = $state(false);
    let imagePreview = $state<string | null>(null);

    function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        
        if (file) {
            if (!file.type.startsWith('image/')) {
                uploadError = 'Please select an image file';
                selectedFile = null;
                imagePreview = null;
                return;
            }

            selectedFile = file;
            imagePreview = URL.createObjectURL(file);
            uploadError = null;
            uploadSuccess = false;
        }
    }

    async function uploadImage() {
        if (!user) {
            uploadError = 'Please sign in to upload images';
            return;
        }

        if (!selectedFile) {
            uploadError = 'Please select an image first';
            return;
        }

        uploading = true;
        uploadError = null;
        uploadSuccess = false;

        try {
            const storage = getStorage(app);
            const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}_${selectedFile.name}`);
            
            await uploadBytes(storageRef, selectedFile);
            const downloadURL = await getDownloadURL(storageRef);
            
            uploadSuccess = true;
            selectedFile = null;
            imagePreview = null;
            imageUrl = downloadURL;
            console.log('File uploaded successfully:', downloadURL);
            
        } catch (error) {
            console.error('Upload error:', error);
            uploadError = 'Failed to upload image. Please try again.';
        } finally {
            uploading = false;
        }
    }
</script>

<div class="upload-container">
    <input
        type="file"
        accept="image/*"
        onchange={handleFileSelect}
        class="file-input"
    />

    {#if imagePreview}
        <div class="preview">
            <img src={imagePreview} alt="Preview" />
        </div>
    {/if}

    <button
        onclick={uploadImage}
        disabled={!selectedFile || uploading || !user}
        class="upload-button"
    >
        {#if uploading}
            Uploading...
        {:else}
            Upload Image
        {/if}
    </button>

    {#if uploadError}
        <p class="error">{uploadError}</p>
    {/if}

    {#if uploadSuccess}
        <p class="success">Image uploaded successfully!</p>
    {/if}

    {#if !user}
        <p class="warning">Please sign in to upload images</p>
    {/if}
</div>

<style>
    .upload-container {
        max-width: 500px;
        margin: 20px auto;
        padding: 20px;
    }

    .file-input {
        margin-bottom: 15px;
    }

    .preview {
        margin: 15px 0;
    }

    .preview img {
        max-width: 100%;
        max-height: 300px;
        object-fit: contain;
    }

    .upload-button {
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .upload-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }

    .error {
        color: #ff0000;
    }

    .success {
        color: #4CAF50;
    }

    .warning {
        color: #ff9800;
    }
</style> 