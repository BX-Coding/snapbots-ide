<script lang="ts">
    import * as AlertDialog from '$lib/components/ui/alert-dialog';
    import ImageUploader from './ImageUploader.svelte';
    import type { Character } from '$lib/types';

    let { 
        open = $bindable(false),
        characters = $bindable<Character[]>([])
    }: {
        open: boolean,
        characters: Character[]
    } = $props();

    let imageUrl = $state('');

    let creating = $state(false);
    let completed = $state(false);

    let newCharacter = $state<Character | null>(null);

    function createCharacter() {
        creating = true;

        console.log('createCharacter ', imageUrl);

        creating = false;
        completed = true;
    }

    function addCharacterToSession() {
        if (newCharacter) {
            characters = [...characters, newCharacter];
            open = false;
            completed = false;
        }
    }
</script>

<button 
    class="min-w-[200px] p-4 border-2 border-dashed border-slate-200 rounded cursor-pointer transition-all duration-200 hover:border-indigo-600 flex items-center justify-center"
    onclick={() => open = true}
    aria-label="Add New Character"
    >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
</button>

<AlertDialog.Root bind:open>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Scan New Character</AlertDialog.Title>
        </AlertDialog.Header>
        <div class="py-4">
            <ImageUploader bind:imageUrl />
        </div>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            {#if creating}
                <AlertDialog.Action disabled>Creating character...</AlertDialog.Action>
            {:else if completed}
                <AlertDialog.Action onclick={addCharacterToSession}>Add Character to Session</AlertDialog.Action>
            {:else}
                <AlertDialog.Action onclick={createCharacter}>Create</AlertDialog.Action>
            {/if}
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root> 