<script lang="ts">
    import type { Character } from '$lib/types';

    let { 
        selectedCharacter,
        characters,
        onSelect,
    } = $props<{ 
        selectedCharacter: Character,
        characters: Character[],
        onSelect: (character: Character) => void,
    }>();

    function selectCharacter(character: Character) {
        onSelect(character);
    }
</script>

{#each characters as character}
    <button 
        class="min-w-[200px] p-4 border-2 border-slate-200 rounded cursor-pointer transition-all duration-200 hover:border-indigo-600 
        {selectedCharacter.id === character.id ? 'border-indigo-600 bg-slate-50' : ''}"
        onclick={() => selectCharacter(character)}
    >
        <h3 class="m-0 mb-2 text-base text-slate-800">{character.name}</h3>
        <div class="text-sm text-slate-500 mb-2">State: {character.state}</div>
        <div class="flex gap-2 flex-wrap">
            {#each character.authors as author}
                <span class="bg-slate-200 px-2 py-1 rounded text-sm text-slate-600">{author}</span>
            {/each}
        </div>
    </button>
{/each}


