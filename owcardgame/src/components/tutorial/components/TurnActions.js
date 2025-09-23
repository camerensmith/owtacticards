function TurnActions() {

    const synergyStyle = {
        width: '20px',
        height: '20px',
        color: 'white',
        fontSize: '1em',
        border: '3px solid steelblue',
        backgroundColor: '#3f547a',
    };

    const tutorialCounterStyle = {
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '50%',
        margin: '4px',
        fontFamily: 'Big-Noodle-Titling',
    };

    return (
        <div
            id='turn-actions-content'
            className='tutorial-content'
            hidden
        >
            <div className='tutorial-content-container'>
                <div className='tutorial-intro'>
                    <p>
                        During your turn you can carry out the
                        following actions:
                    </p>
                </div>
                <div className='tutorial-section'>
                    <div className='tutorial-heading'>
                        Play a Hero Card
                    </div>
                    <span>
                        <p>
                            Drag 1 Hero Card from your hand into the
                            Front, Middle, or Back Row. Any effects
                            that occur when a Hero is played trigger
                            NOW. The card's Power and Synergy scores
                            will be added to your scores at this
                            point.
                        </p>
                    </span>
                </div>
                <div className='tutorial-section'>
                    <span className='tutorial-heading'>
                        Use Deploy Ability (if you wish)
                    </span>
                    <br />
                    <span>
                        <p>
                            In order to use a Hero's ability, click
                            on the Hero Card. This will show a
                            larger version of the card in the middle
                            of your screen, which is called the Card
                            Focus. Click on the text of the ability
                            that you want to use. If the ability
                            requires you to target an ally or enemy
                            card, click on the card to choose it as
                            your target.
                        </p>
                        <p>
                            A Hero's Deploy Ability can only be used
                            right after you play them onto the
                            battlefield. If you decide to NOT use
                            their Deploy Ability you may not use it
                            at a later time unless they have been
                            returned to your hand and played again.
                        </p>
                        <p>
                            <strong>Please Note: </strong>The
                            ability descriptions have not been
                            changed from the original tabletop game,
                            and may refer to placing tokens or
                            rotating cards when abilities happen
                            which are irrelevant to the digital
                            version.
                        </p>
                    </span>
                </div>
                <div className='tutorial-section'>
                    <div className='tutorial-heading'>
                        Activate an Ultimate Ability
                    </div>
                    <span>
                        <p>
                            Choose a Hero that has already been
                            played and activate their Ultimate
                            Ability. There must be enough Synergy
                            <span
                                style={{
                                    ...synergyStyle,
                                    ...tutorialCounterStyle,
                                }}
                            >
                                3
                            </span>
                            in that row to pay for the cost of the
                            Ultimate Ability. You may only use each
                            Ultimate Ability once per round unless
                            the Hero has been returned to your hand
                            and played a second time.
                        </p>
                        <p>
                            Once the Ultimate Ability has been used,
                            the Synergy cost will be deducted from
                            the row's Synergy score.
                        </p>
                    </span>
                </div>

                <div className='tutorial-section'>
                    <div className='tutorial-heading'>Pass</div>
                    <span>
                        <p>
                            You must have six cards on the
                            battlefield in order to choose the Pass
                            Action. After passing you may take no
                            more actions this round.
                        </p>
                    </span>
                </div>
            </div>
        </div>
    );
}

export default TurnActions;