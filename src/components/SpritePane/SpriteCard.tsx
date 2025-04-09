import React, { useContext, useEffect, useState } from 'react';
import { ItemCard } from '../ItemCard';
import getCostumeUrl from '../../util/get-costume-url';
import { Target } from '../EditorPane/types';
import usePatchStore from '../../store';
import { useEditingTarget } from '../../hooks/useEditingTarget';
import { CostumeImage } from '../CostumeImage';
import { setDisplayImage } from '../ImageDisplay';

type SpriteCardProps = {
    target: Target,
}

export function SpriteCard({ target }: SpriteCardProps) {
    const [editingTarget, setEditingTarget] = useEditingTarget();
    const globalVars = usePatchStore((state) => state.globalVariables);
    
    // Find the current state variable for this sprite if it exists
    const currentStateVar = globalVars.find(v => v.name === 'current_state');
    const currentState = currentStateVar ? currentStateVar.value as string : null;

    const onClick = () => {
        // Update the editing target first
        setEditingTarget(target.id);
        
        // Only try to update the image display if we have a valid target id
        if (target?.id) {
            try {
                // If we have a current state, try to display that image
                if (currentState) {
                    setDisplayImage(target.id, currentState);
                }
            } catch (error) {
                console.error('Error updating display image:', error);
            }
        }
    }

    let titleName = target?.sprite?.name

    if (target?.sprite?.name.length > 13) {
        titleName = titleName.substring(0, 10) + '...'
    }

    return (
        <>
            <ItemCard
                title={titleName}
                selected={editingTarget?.id === target.id}
                onClick={onClick}
                key={target?.sprite?.name}
                width={120}
                height={120}
            >
                <CostumeImage costume={target?.sprite?.costumes[0]} className="costumeCardImage" />
            </ItemCard>
        </>
    );
}