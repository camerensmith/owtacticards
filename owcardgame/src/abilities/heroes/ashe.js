import $ from 'jquery';
import { showOnEnterChoice } from '../engine/modalController';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import crosshair from '../../assets/crosshair.svg';
import { showMessage, clearMessage } from '../engine/targetingBus';
import { selectCardTarget } from '../engine/targeting';
import { getAudioFile, playAudioByKey } from '../../assets/imageImports';
import { withAIContext } from '../engine/aiContextHelper';

function setTargetingCursor(active) {
    try {
        if (active) {
            document.body.style.cursor = `url(${crosshair}) 5 5, crosshair`;
        } else {
            document.body.style.cursor = '';
        }
    } catch (e) {}
}

function playAbilitySound(abilityNumber) {
    try {
        const audioSrc = getAudioFile(`ashe-ability${abilityNumber}`);
        if (audioSrc) {
            console.log(`Playing Ashe ability ${abilityNumber} sound...`);
            const audio = new Audio(audioSrc);
            audio.play().then(() => {
                console.log(`Ashe ability ${abilityNumber} sound played successfully`);
            }).catch(err => {
                console.log(`Ashe ability ${abilityNumber} sound play failed:`, err);
            });
        }
    } catch (err) {
        console.log(`Ashe ability ${abilityNumber} audio creation failed:`, err);
    }
}

// Ashe modular onEnter implementation
export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    const onEnter1 = {
        name: 'The Viper',
        title: 'The Viper',
        description: 'Deal 2 damage to one enemy ignoring shields.'
    };
    const onEnter2 = {
        name: 'The Viper (Split Fire)',
        title: 'The Viper (Split Fire)',
        description: 'Deal 1 damage to two enemies in the same row ignoring shields.'
    };

    showOnEnterChoice('Ashe', onEnter1, onEnter2, withAIContext(playerHeroId, async (choiceIndex) => {
        if (choiceIndex === 0) {
            // 2 damage ignoring shields to one enemy
            
            // AI AUTO-SELECT
            const isAI = (window.__ow_isAITurn || window.__ow_aiTriggering) && playerNum === 2;
            let target = null;
            
            if (isAI && window.__ow_aiUltimateTarget) {
                target = window.__ow_aiUltimateTarget;
                console.log("Ashe AI using provided target:", target);
            } else if (!isAI) {
                setTargetingCursor(true);
                showMessage("Ashe: Select One Target!");
                target = await selectCardTarget({ isDamage: true });
            }
            
            if (!target || !target.cardId) {
                console.log('Ashe: No valid target selected');
                setTargetingCursor(false);
                clearMessage();
                return;
            }
            
            try {
                if (target) {
                    // Validate target is enemy
                    const targetPlayerNum = parseInt(target.cardId[0]);
                    if (targetPlayerNum === playerNum) {
                        showMessage('Ashe: Must target enemy!');
                        setTimeout(() => clearMessage(), 2000);
                        setTargetingCursor(false);
                        return;
                    }

                    console.log('Ashe Ability 1 - Applying damage:', { targetCardId: target.cardId, targetRow: target.rowId, amount: 2, ignoreShields: true });
                    dealDamage(target.cardId, target.rowId, 2, true, playerHeroId);
                    try { effectsBus.publish(Effects.showDamage(target.cardId, 2)); } catch {}
                    playAbilitySound(1); // voice line
                    playAudioByKey('ashe-shoot1');
                }
            } catch (error) {
                console.error('Ashe ability 1 error:', error);
            }

            setTargetingCursor(false);
            clearMessage();
        } else if (choiceIndex === 1) {
            // 1 damage ignoring shields to two enemies in the same row
            setTargetingCursor(true);
            showMessage('Ashe: Select Two Targets!');

            try {
                const target1 = await selectCardTarget({ isDamage: true });
                if (!target1) {
                    setTargetingCursor(false);
                    clearMessage();
                    return;
                }

                // Validate first target is enemy
                const target1PlayerNum = parseInt(target1.cardId[0]);
                if (target1PlayerNum === playerNum) {
                    showMessage('Ashe: Must target enemies!');
                    setTimeout(() => clearMessage(), 2000);
                    setTargetingCursor(false);
                    return;
                }

                showMessage('Ashe: Select Final Target!');
                const target2 = await selectCardTarget({ isDamage: true });

                if (!target2) {
                    setTargetingCursor(false);
                    clearMessage();
                    return;
                }

                // Validate second target is enemy and same row
                const target2PlayerNum = parseInt(target2.cardId[0]);
                if (target2PlayerNum === playerNum || target1.rowId !== target2.rowId) {
                    showMessage('Ashe: Targets must be enemies in the same row!');
                    setTimeout(() => clearMessage(), 2000);
                    setTargetingCursor(false);
                    return;
                }

                // Apply damage to both targets
                dealDamage(target1.cardId, target1.rowId, 1, true, playerHeroId);
                dealDamage(target2.cardId, target2.rowId, 1, true, playerHeroId);
                try { effectsBus.publish(Effects.showDamage(target1.cardId, 1)); } catch {}
                try { effectsBus.publish(Effects.showDamage(target2.cardId, 1)); } catch {}
                playAbilitySound(2); // voice line
                playAudioByKey('ashe-shoot2');
            } catch (error) {
                console.error('Ashe ability 2 error:', error);
            }

            setTargetingCursor(false);
            clearMessage();
        }
    }));
}

export default { onEnter };


