import $ from 'jquery';
import { showOnEnterChoice } from '../engine/modalController';
import { dealDamage } from '../engine/damageBus';
import crosshair from '../../assets/crosshair.svg';
import { showMessage, clearMessage } from '../engine/targetingBus';
import { getAudioFile, playAudioByKey } from '../../assets/imageImports';

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
// doDamage(targetCardId, targetRowId, amount, ignoreShields)
export function onEnter({ playerNum, rowId }) {
    const onEnter1 = { name: 'The Viper', description: 'Deal 2 damage to one enemy ignoring shields.' };
    const onEnter2 = { name: 'The Viper (Split Fire)', description: 'Deal 1 damage to two enemies in the same row ignoring shields.' };

    showOnEnterChoice('Ashe', onEnter1, onEnter2, (choiceIndex) => {
        if (choiceIndex === 0) {
            // 2 damage ignoring shields to one enemy
            setTargetingCursor(true);
            showMessage('Select One Target!');
            const handler = (e) => {
                try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation && e.stopImmediatePropagation(); } catch (err) {}
                const targetCardId = $(e.target).closest('.card').attr('id');
                const targetRow = $(e.target).closest('.row').attr('id');
                console.log('Ashe Ability 1 - Target clicked:', { targetCardId, targetRow, playerNum });
                
                if (targetRow[0] === 'p' || parseInt(targetRow[0]) === playerNum) {
                    console.log('Ashe Ability 1 - Invalid target (own row or hand)');
                    return;
                }
                
                console.log('Ashe Ability 1 - Applying damage:', { targetCardId, targetRow, amount: 2, ignoreShields: true });
                dealDamage(targetCardId, targetRow, 2, true);
                playAbilitySound(1); // voice line
                playAudioByKey('ashe-shoot1');
                setTargetingCursor(false);
                clearMessage();
                $('.card').off('click', handler);
            };
            $('.card').on('click', handler);
        } else if (choiceIndex === 1) {
            // 1 damage ignoring shields to two enemies in the same row
            let selected = [];
            setTargetingCursor(true);
            showMessage('Select Two Targets!');
            const handler = (e) => {
                try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation && e.stopImmediatePropagation(); } catch (err) {}
                const targetCardId = $(e.target).closest('.card').attr('id');
                const targetRow = $(e.target).closest('.row').attr('id');
                if (targetRow[0] === 'p' || parseInt(targetRow[0]) === playerNum) return;
                if (selected.length === 0) {
                    selected.push({ targetCardId, targetRow });
                    showMessage('Select Final Target!');
                } else if (selected.length === 1) {
                    if (selected[0].targetRow !== targetRow) return;
                    selected.push({ targetCardId, targetRow });
                    $('.card').off('click', handler);
                    // Apply damage to both targets
                    dealDamage(selected[0].targetCardId, selected[0].targetRow, 1, true);
                    dealDamage(selected[1].targetCardId, selected[1].targetRow, 1, true);
                    playAbilitySound(2); // voice line
                    playAudioByKey('ashe-shoot2');
                    setTargetingCursor(false);
                    clearMessage();
                }
            };
            $('.card').on('click', handler);
        }
    });
}

export default { onEnter };


