<script lang="ts">
    import { getAuth, type User } from 'firebase/auth';
    import { onMount } from 'svelte';
    import GameCanvas from '$lib/components/GameCanvas.svelte';
    import CodeEditor from '$lib/components/CodeEditor.svelte';
    import CharacterSelector from '$lib/components/CharacterSelector.svelte';
    import PythonRunner from '$lib/components/PythonRunner.svelte';
    import type { Character } from '$lib/types';
    import { starting_characters } from '$lib/test/testing_environment.ts';
    import CharacterManagement from '$lib/components/CharacterManagement.svelte';
    import CharacterCreation from '$lib/components/CharacterCreation.svelte';
    
    const auth = getAuth();
    let currentUser = $state<User | null>(null);
    
    let characters = $state<Character[]>(starting_characters);
    let selectedCharacter = $state<Character | null>(null);
    let codeEditor = $state<CodeEditor | null>(null);

    let gameCanvas = $state<GameCanvas | null>(null);

    let showNewCharacterDialog = $state(false);

    $effect(() => {
        if ((!selectedCharacter && characters.length > 0) || (selectedCharacter && !characters.includes(selectedCharacter))) {
            selectedCharacter = characters[0];
        }
    });

    onMount(() => {
        return auth.onAuthStateChanged((user) => {
            currentUser = user;
        });
    });

    function handleCodeChange(code: string) {
        if (selectedCharacter) {
            selectedCharacter.code = code;
        }
    }

    function handleCharacterSelect(character: Character) {
        selectedCharacter = character;
        codeEditor?.updateCode(character.code);
    }
</script>

<svelte:head>
    <title>Field Day - Play with your friends at recess</title>
    <meta name="description" content="A Python Robot Simulation" />
</svelte:head>

<div class="container mx-auto max-w-[1400px] px-8 py-8">
    <h1 class="text-4xl text-slate-800 mb-2 font-bold">Field Day</h1>
    <p class="text-lg text-slate-500 mb-8">Play with your friends at recess</p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div class="flex flex-col gap-4 w-full">
            {#if selectedCharacter}
                <CodeEditor 
                    bind:this={codeEditor}
                    {selectedCharacter} 
                    onCodeChange={handleCodeChange}
                />
                <CharacterManagement 
                    character={selectedCharacter}
                    bind:characters
                />
            {/if}
            <PythonRunner bind:characters />
        </div>
        <div class="flex flex-col gap-4 aspect-square">
            <GameCanvas 
                bind:this={gameCanvas}
                characters={characters}
                backgroundColor="#90EE90"
                dotRadius={10}
                backgroundSize={[1000, 1000]}
            />
        </div>
    </div>
    <div class="flex gap-4 p-4 bg-white rounded-lg shadow-md overflow-x-auto">
        {#if selectedCharacter}
            <CharacterSelector 
                {characters} 
                {selectedCharacter} 
                onSelect={handleCharacterSelect}
            />
        {/if}
        <CharacterCreation bind:open={showNewCharacterDialog} bind:characters={characters} />
    </div>
</div>
