import { otherImages, heroIconImages } from '../../../assets/imageImports';

function CardInfo() {

    return (
        <div
            id='card-info-content'
            className='tutorial-content'
            hidden
        >
            <div
                id='card-info-container'
                className='tutorial-content-container'
            >
                <div id='card-info-left' className='card-info'>
                    <div className='card-info-section tutorial-section'>
                        <span className='tutorial-heading'>
                            Class
                        </span>
                        <div id='card-info-class'>
                            <span>
                                <img
                                    src={
                                        otherImages.offenceClassIcon
                                    }
                                    alt='Offence class icon'
                                    className='classicon'
                                />
                                <span>
                                    <strong>Offence</strong> - High
                                    damage
                                </span>
                            </span>
                            <span>
                                <img
                                    src={
                                        otherImages.defenceClassIcon
                                    }
                                    alt='Defence class icon'
                                    className='classicon'
                                />
                                <span>
                                    <strong>Defense</strong> - Area
                                    control and status effects
                                </span>
                            </span>
                            <span>
                                <img
                                    src={
                                        otherImages.tankClassIcon
                                    }
                                    alt='Tank class icon'
                                    className='classicon'
                                />
                                <span>
                                    <strong>Tank</strong> - Shields
                                    and good survivability
                                </span>
                            </span>
                            <span>
                                <img
                                    src={
                                        otherImages.supportClassIcon
                                    }
                                    alt='Support class icon'
                                    className='classicon'
                                />
                                <span>
                                    <span>
                                        <strong>Support</strong> -
                                        Healing and damage boost
                                    </span>
                                </span>
                            </span>
                        </div>
                    </div>
                    <div
                        id='hero-name-section'
                        className='card-info-section tutorial-section'
                    >
                        <span className='tutorial-heading'>
                            Hero Name
                        </span>
                    </div>
                    <div className='card-info-section tutorial-section'>
                        <span className='tutorial-heading'>
                            Power/Synergy Scores
                        </span>
                        <div>
                            When you play a Hero card, the Hero's
                            power and synergy are added to your
                            Power and Synergy scores. The amount of
                            Power and Synergy added depends on which
                            row the Hero is put in. These circles
                            represent the three rows (top circle -
                            front row, middle circle - middle row,
                            bottom circle - back row) with Power on
                            the left and Synergy on the right.
                        </div>
                    </div>
                </div>
                <div id='card-info-center' className='card-info'>
                    <img
                        src={
                            otherImages.dvaExample
                        }
                        alt='Card tutorial'
                    />
                </div>
                <div id='card-info-right' className='card-info'>
                    <div className='card-info-section tutorial-section'>
                        <span className='tutorial-heading'>
                            Health
                        </span>
                        <div id='card-info-class'>
                            How much damage this Hero can take
                            before being defeated. A defeated Hero's
                            card will turn grey when their health
                            drops to 0.
                        </div>
                    </div>
                    <div className='card-info-section tutorial-section'>
                        <span className='tutorial-heading'>
                            Shield
                        </span>
                        <div id='card-info-class'>
                            Some Heroes have the ability to shield
                            themselves, other Heroes, or even an
                            entire row. Shields will take damage in
                            place of a Hero's health.
                        </div>
                    </div>
                    <div>
                        {/* Spacer div to separate health/shields from abilities descriptions */}
                    </div>
                    <div className='card-info-section tutorial-section'>
                        <span className='tutorial-heading'>
                            Deploy Ability
                        </span>
                        <div>
                            You may choose to use this ability only
                            when you play this card from your hand.
                        </div>
                    </div>
                    <div className='card-info-section tutorial-section'>
                        <span className='tutorial-heading'>
                            Ultimate Ability
                        </span>
                        <div>
                            You may use this ability at any time
                            after the card has been played and is
                            still alive, but you must have
                            sufficient synergy in the Hero's row.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CardInfo;