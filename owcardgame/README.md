# Overwatch Card Game

This is a fan made card game based on the popular hero-shooter Overwatch.
All characters, art and the Overwatch logo and brand are the property of Blizzard Entertainment, Inc.

## About

The original tabletop card game was designed and created by Reddit user barberian912, and was digitised with their permission by me.

This is a two-player competitive card game similar in design to Gwent. Each players takes turns to play a card into one of three rows. Cards generate a certain amount of Power depending on which row they are played into, with the Player that has the most Power at the end of the round winning. Each card also has two abilities that can be used to help allies or hinder enemy cards. Cards that are defeated do not contribute any Power to their Player. The first Player to win two rounds wins the match.

## How to play

![Overview of the Overwatch Card Game](https://github.com/nathanhmiles/owcardgame/blob/main/src/assets/overview2.gif)

### How to win

Each player takes turns to play one card into one of three rows. Each card generates a certain amount of Power depending on which row they are played into. The player with the most power at the end of the round wins, with two rounds needed to win the match. The round ends when both players have played six cards and pressed the Pass button. For more information on a card's Power, please see the **Card Breakdown** below.

If both players have the same Power score, the player with the higher total Synergy wins. If both players' Synergy scores are also tied, the round is a draw and neither player receives a win.

### Starting a game

Both players should begin by drawing 8 cards each. Then the players each take turns to play one card per turn. At the end of your turn, click the End Turn button to allow the other player to take their turn. You can tell which player's turn it is by which cards are facing up. To find out exactly what you can do on your turn, please see the Turn Actions section above.

### Scores, abilities and counters

**Power**: Each player has one Power score which increases as cards are played. A card's Power is subtracted from the player's Power score if it is defeated. The player with the higher power score at the end of the round wins.

**Synergy**: Each row has its own Synergy score. The row's synergy increases as Heroes are played into that row. Synergy is spent when Heroes use their Ultimate Ability.

**Health**: How much damage the Hero can take before it is defeated. A defeated Hero's Power is subtracted from the player's Power score.

**Shield**: A Shield can be placed either on a specific Hero or on an entire row. If a Hero has Shield or is in a row that has Shield, the Shield will take any damage before the Hero's Health takes damage.

**Effects**: There are a number of different positive and negative Effects that Heroes can apply to ally and enemy Heroes, as well as ally and enemy rows. If a Hero applies an Effect to a Hero or row, the Hero's counter will show up next to the row or on the Hero card. These counters can be clicked to show the card which applied the Effect, so that you can easily read the Ability description to understand what the Effect does.

### Card Breakdown

<img src="https://github.com/nathanhmiles/owcardgame/blob/main/src/assets/dva-example.webp" width="400" />

#### Class

**Offence** - Represented by an orange icon depicting three bullets. Offence heroes have high damage abilities.

**Defense** - Represented by a blue icon depicting a chess piece. Defense heroes provide area control and status effects.

**Tank** - Represented by a green shield icon. Tanks often generate shields for themselves and allies, and have good survivability.

**Support** - Represented by a purple plus icon. Support heroes can heal ally heroes as well as other beneficial effects, such as a damage boost.

#### Power/Synergy Scores

When you play a Hero card, the Hero's power and synergy are added to your Power and Synergy scores. The amount of Power and Synergy added depends on which row the Hero is put in. These circles represent the three rows (top circle - front row, middle circle - middle row, bottom circle - back row) with Power on the left and Synergy on the right.

#### Health

How much damage this Hero can take before being defeated. A defeated Hero's card will turn grey when their health drops to 0.

#### Shield

Some Heroes have the ability to shield themselves, other Heroes, or even an entire row. Shields will take damage in place of a Hero's health.

#### Deploy Ability

You may choose to use this ability only when you play this card from your hand.

#### Ultimate Ability

You may use this ability at any time after the card has been played and is still alive, but you must have sufficient synergy in the Hero's row.

### Turn Actions

During your turn you can carry out the following actions:

#### Play a Hero Card

Drag 1 Hero Card from your hand into the Front, Middle, or Back Row. Any effects that occur when a Hero is played trigger NOW. The card's Power and Synergy scores will be added to your scores at this point.

#### Use Deploy Ability (if you wish)

In order to use a Hero's ability, click on the Hero Card. This will show a larger version of the card in the middle of your screen, which is called the Card Focus. Click on the text of the ability that you want to use. If the ability requires you to target an ally or enemy card, click on the card to choose it as your target.

A Hero's Deploy Ability can only be used right after you play them onto the battlefield. If you decide to NOT use their Deploy Ability you may not use it at a later time unless they have been returned to your hand and played again.

**Please Note**: The ability descriptions have not been changed from the original tabletop game, and may refer to placing tokens or rotating cards when abilities happen which are irrelevant to the digital version.

#### Activate an Ultimate Ability

Choose a Hero that has already been played and activate their Ultimate Ability. There must be enough Synergy 3 in that row to pay for the cost of the Ultimate Ability. You may only use each Ultimate Ability once per round unless the Hero has been returned to your hand and played a second time.

Once the Ultimate Ability has been used, the Synergy cost will be deducted from the row's Synergy score.

#### Pass

You must have six cards on the battlefield in order to choose the Pass Action. After passing you may take no more actions this round.

## Planned Updates

- A log showing all damage and effects
- Optional tooltips to guide the players on how to play the game
- Online play (long-term goal)
