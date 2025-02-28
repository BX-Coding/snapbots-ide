<script lang="ts">
    import type { Character } from '$lib/types';
    import * as AlertDialog from '$lib/components/ui/alert-dialog/index.ts';

    let { 
        character, 
        characters = $bindable<Character[]>([])
    }: {
        character: Character;
        characters: Character[];
    } = $props();

    let showEditDialog = $state(false);
    let showDeleteDialog = $state(false);

    function handleDelete() {
        characters = characters.filter(c => c.id !== character.id);
        showDeleteDialog = false;
    }
</script>

<div class="flex gap-2">
    <button
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        onclick={() => showEditDialog = true}
    >
        Edit
    </button>
    <button
        class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        onclick={() => showDeleteDialog = true}
    >
        Delete
    </button>
</div>

<!-- Edit Dialog -->
{#if showEditDialog}
    <AlertDialog.AlertDialog open>
        <AlertDialog.AlertDialogContent>
            <h2 class="text-xl font-bold mb-4">Edit {character.name}</h2>
            <!-- Edit form will go here -->
            <div class="flex justify-end gap-2 mt-4">
                <AlertDialog.AlertDialogCancel
                    onclick={() => showEditDialog = false}
                >
                    Cancel
                </AlertDialog.AlertDialogCancel>
            </div>
        </AlertDialog.AlertDialogContent>
    </AlertDialog.AlertDialog>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog}
    <AlertDialog.AlertDialog open>
        <AlertDialog.AlertDialogContent>
            <h2 class="text-xl font-bold mb-4">Delete {character.name}</h2>
            <p>Are you sure you want to delete {character.name}?</p>
            <div class="flex justify-end gap-2 mt-4">
                <AlertDialog.AlertDialogCancel
                    onclick={() => showDeleteDialog = false}
                >
                    Cancel
                </AlertDialog.AlertDialogCancel>
                <AlertDialog.AlertDialogAction
                    class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    onclick={handleDelete}
                >
                    Delete
                </AlertDialog.AlertDialogAction>
            </div>
        </AlertDialog.AlertDialogContent>
    </AlertDialog.AlertDialog>
{/if} 