import { parseCodeFromResponse } from "./snapbotModalService";
import usePatchStore from "../store";
import { sprites } from "../assets/sprites";
import { sounds } from "../assets/sounds";
import { useCostumeHandlers } from "../hooks/useCostumeUploadHandlers";
import { useSoundHandlers } from "../hooks/useSoundUploadHandlers";
import { useAddSprite } from "../components/SpritePane/onAddSpriteHandler";
import { addImageToSprite, setDisplayImage } from "../components/ImageDisplay";

export interface SnapbotServerResponse {
    status: string;
    code?: any;
    costumes?: string[];
    sounds?: string[];
    name?: string;
    global_vars?: Record<string, any>;
    diagram_images?: Record<string, string>;
}

export interface ApplySnapbotResponseDeps {
    patchVM: any;
    snapbotMode: string;
    setGlobalVariable: (name: string, value: string | number | boolean) => void;
    setProjectChanged: (changed: boolean) => void;
    setSelectedCostumeIndex: (idx: number) => void;
    handleAddCostumesToEditingTarget: (costumes: any[], fromLibrary: boolean) => void;
    handleAddSoundToEditingTarget: (sound: any, fromLibrary: boolean) => Promise<void> | void;
    setSnapbotSpriteCode: (targetId: string, code: string) => Promise<void>;
}

export interface ApplySnapbotResponseOptions {
    overrideSpriteName?: string;
    onStatus?: (status: string) => void;
    /**
     * If the backend generated the code with a different uuid than newTargetId
     * (e.g. session flow uses the submission_id), pass it here. The generated
     * code references the uuid in variable names like curr_state_<stripped_uuid>,
     * so we substitute it with the frontend target ID so the display logic in
     * StateImageDisplay (which reads curr_state_<stripped_currentTargetId>) finds
     * the variable. In the single-device flow uuid == newTargetId, so omit this.
     */
    backendUuid?: string;
}

const addKickThreadToSoccerBall = async (patchVM: any, newSpriteName: string) => {
    try {
        const allTargets = patchVM.getAllRenderedTargets();
        const soccerBallTarget = allTargets.find(
            (target: any) => target.sprite?.name === "SoccerBall"
        );
        if (!soccerBallTarget) {
            console.warn("SoccerBall sprite not found, skipping kick thread creation");
            return;
        }

        const kickScript = `import math
import time

spriteName = "${newSpriteName}"
kickDistanceThreshold = 60
kickForce = 10000

kickerX = getAttributeOf(spriteName, 'x position')
kickerY = getAttributeOf(spriteName, 'y position')

ballX = getX()
ballY = getY()

distance = ((kickerX - ballX) ** 2 + (kickerY - ballY) ** 2) ** 0.5

lastKickedTime = time.time()

if (distance < kickDistanceThreshold):
  # the ball should be kicked
  angleToKicker = math.atan2(kickerY - ballY, kickerX - ballX)

  # stop all prior velocity
  ballXVel = 0
  ballYVel = 0

  ballXAcc = math.cos(angleToKicker) * kickForce * -1
  ballYAcc = math.sin(angleToKicker) * kickForce * -1`;

        const broadcastMessage = `${newSpriteName}_kick`;
        const threadId = await soccerBallTarget.addThread(
            "",
            "event_whenbroadcastreceived"
        );
        const thread = soccerBallTarget.getThread(threadId);
        if (thread) {
            thread.updateThreadTriggerEventOption(broadcastMessage);
            thread.displayName = `${newSpriteName} Kick`;
            thread.updateThreadScript(kickScript);
        }
    } catch (error) {
        console.error("Error adding kick thread to SoccerBall:", error);
    }
};

/**
 * Apply a Modal /generation response to an already-created sprite target. Mirrors the original
 * post-Modal pipeline that lived inline in SnapbotUploader so that both the single-device IDE
 * flow and the multi-device session listener can drive sprite creation through the same path.
 *
 * The caller is responsible for creating the target (via onAddSprite) and handling Modal-call
 * errors. This function assumes serverResponse is already in hand.
 */
export async function applySnapbotResponse(
    serverResponse: SnapbotServerResponse,
    newTargetId: string,
    deps: ApplySnapbotResponseDeps,
    options: ApplySnapbotResponseOptions = {}
): Promise<void> {
    const {
        patchVM,
        snapbotMode,
        setGlobalVariable,
        setProjectChanged,
        setSelectedCostumeIndex,
        handleAddCostumesToEditingTarget,
        handleAddSoundToEditingTarget,
        setSnapbotSpriteCode,
    } = deps;
    const status = (s: string) => options.onStatus?.(s);

    const strippedTargetId = newTargetId.replace(/[^a-zA-Z0-9]/g, "");
    const stateVarName = `curr_state_${strippedTargetId}`;
    let startingState = "start";
    if (
        serverResponse.status === "success" &&
        serverResponse.diagram_images &&
        Object.keys(serverResponse.diagram_images).length > 0
    ) {
        startingState = Object.keys(serverResponse.diagram_images)[0];
    }
    patchVM.updateGlobalVariable(stateVarName, startingState);
    usePatchStore.getState().setGlobalVariable(stateVarName, startingState);

    let generatedCode = "";
    if (serverResponse.status === "success" && serverResponse.code) {
        const parsedCode = parseCodeFromResponse(serverResponse.code);
        if (parsedCode) {
            generatedCode = parsedCode;
        }
    }

    // Realign uuid-based identifiers in the generated code with the frontend target ID.
    // The backend bakes the uuid it was given into names like curr_state_<stripped_uuid>;
    // in the session flow the uuid is a server-issued submission_id, not newTargetId, so
    // the StateImageDisplay (which keys off the frontend target ID) would otherwise read
    // a different variable than the code writes to. Replace both stripped and raw forms.
    if (options.backendUuid && options.backendUuid !== newTargetId) {
        const strippedBackendUuid = options.backendUuid.replace(/[^a-zA-Z0-9]/g, "");
        if (strippedBackendUuid && strippedBackendUuid !== strippedTargetId) {
            generatedCode = generatedCode.split(strippedBackendUuid).join(strippedTargetId);
        }
        if (options.backendUuid !== strippedBackendUuid) {
            generatedCode = generatedCode.split(options.backendUuid).join(newTargetId);
        }
    }

    if (
        serverResponse.status === "success" &&
        serverResponse.diagram_images &&
        Object.keys(serverResponse.diagram_images).length > 0
    ) {
        status("Processing diagram images...");
        const stateNames = Object.keys(serverResponse.diagram_images);
        stateNames.forEach((stateName) => {
            let base64Image = serverResponse.diagram_images?.[stateName] || "";
            if (base64Image && !base64Image.startsWith("data:")) {
                base64Image = "data:image/png;base64," + base64Image;
            }
            if (base64Image) {
                addImageToSprite(newTargetId, stateName, base64Image);
            }
        });
        if (stateNames.length > 0) {
            setDisplayImage(newTargetId, stateNames[0]);
        }
    }

    status("Applying generated code to sprite...");
    await setSnapbotSpriteCode(newTargetId, generatedCode);

    if (serverResponse.status === "success") {
        const finalName = options.overrideSpriteName ?? serverResponse.name;
        if (finalName) {
            status("Setting sprite name...");
            patchVM.renameSprite(newTargetId, finalName);
            if (snapbotMode === "soccer") {
                status("Adding kick thread to SoccerBall...");
                await addKickThreadToSoccerBall(patchVM, finalName);
            }
        }

        if (serverResponse.global_vars) {
            status("Adding global variables...");
            Object.entries(serverResponse.global_vars).forEach(([name, value]) => {
                patchVM.updateGlobalVariable(name, value);
                setGlobalVariable(name, value as string | number | boolean);
            });
        }

        if (serverResponse.costumes && serverResponse.costumes.length > 0) {
            status("Adding costumes to sprite...");
            for (const costumeName of serverResponse.costumes) {
                try {
                    const costumeAsset = sprites
                        .find((sprite) =>
                            sprite.costumes.some((costume) => costume.name === costumeName)
                        )
                        ?.costumes.find((costume) => costume.name === costumeName);
                    if (costumeAsset) {
                        handleAddCostumesToEditingTarget([costumeAsset], true);
                    } else {
                        console.error(`Costume not found: ${costumeName}`);
                    }
                } catch (error) {
                    console.error(`Failed to add costume ${costumeName}:`, error);
                }
            }
            setSelectedCostumeIndex(patchVM.editingTarget.currentCostume);
            patchVM.editingTarget.sprite.costumes.splice(0, 1);
        }

        if (serverResponse.sounds && serverResponse.sounds.length > 0) {
            status("Adding sounds to sprite...");
            for (const soundName of serverResponse.sounds) {
                try {
                    const soundAsset = sounds.find((sound) => sound.name === soundName);
                    if (soundAsset) {
                        await handleAddSoundToEditingTarget(soundAsset, true);
                    } else {
                        console.error(`Sound not found: ${soundName}`);
                    }
                } catch (error) {
                    console.error(`Failed to add sound ${soundName}:`, error);
                }
            }
        }

        patchVM.editingTarget.x = Math.random() * 200 - 100;
        patchVM.editingTarget.y = Math.random() * 200 - 100;
    }

    setProjectChanged(true);
}

/**
 * Convenience hook: gathers all dependencies applySnapbotResponse needs from the zustand store
 * and the existing handler hooks. Use this inside components; for non-React callers, assemble
 * ApplySnapbotResponseDeps manually.
 */
export function useApplySnapbotResponseDeps(): ApplySnapbotResponseDeps & {
    onAddSprite: () => Promise<string | undefined>;
} {
    const patchVM = usePatchStore((state) => state.patchVM);
    const setGlobalVariable = usePatchStore((state) => state.setGlobalVariable);
    const setProjectChanged = usePatchStore((state) => state.setProjectChanged);
    const setSelectedCostumeIndex = usePatchStore((state) => state.setSelectedCostumeIndex);
    const { handleAddCostumesToEditingTarget } = useCostumeHandlers();
    const { handleAddSoundToEditingTarget } = useSoundHandlers();
    const { onAddSprite, setSnapbotSpriteCode } = useAddSprite();

    return {
        patchVM,
        snapbotMode: localStorage.getItem("snapbotMode") || "simulation",
        setGlobalVariable,
        setProjectChanged,
        setSelectedCostumeIndex,
        handleAddCostumesToEditingTarget,
        handleAddSoundToEditingTarget,
        setSnapbotSpriteCode,
        onAddSprite,
    };
}
