import React, { useState } from 'react';
import { AI_DIFFICULTY, AI_PERSONALITY } from '../ai/AIController';

const AIDifficultySelector = ({ onDifficultyChange, onPersonalityChange, currentDifficulty = AI_DIFFICULTY.MEDIUM, currentPersonality = AI_PERSONALITY.BALANCED }) => {
    const [isOpen, setIsOpen] = useState(false);

    const difficultyOptions = [
        { value: AI_DIFFICULTY.EASY, label: 'Easy', description: 'Random decisions, basic targeting' },
        { value: AI_DIFFICULTY.MEDIUM, label: 'Medium', description: 'Strategic but predictable' },
        { value: AI_DIFFICULTY.HARD, label: 'Hard', description: 'Advanced combos and counter-play' }
    ];

    const personalityOptions = [
        { value: AI_PERSONALITY.BALANCED, label: 'Balanced', description: 'Equal focus on power and synergy' },
        { value: AI_PERSONALITY.AGGRESSIVE, label: 'Aggressive', description: 'Prioritizes immediate power and damage' },
        { value: AI_PERSONALITY.CALCULATED, label: 'Calculated', description: 'Focuses on synergy and long-term strategy' }
    ];

    const getCurrentDifficultyLabel = () => {
        return difficultyOptions.find(opt => opt.value === currentDifficulty)?.label || 'Medium';
    };

    const getCurrentPersonalityLabel = () => {
        return personalityOptions.find(opt => opt.value === currentPersonality)?.label || 'Balanced';
    };

    return (
        <div className="ai-difficulty-selector">
            <button 
                className="ai-selector-button"
                onClick={() => setIsOpen(!isOpen)}
                title="AI Difficulty Settings"
            >
                🤖 {getCurrentDifficultyLabel()} - {getCurrentPersonalityLabel()}
            </button>
            
            {isOpen && (
                <div className="ai-selector-dropdown">
                    <div className="ai-selector-section">
                        <h4>Difficulty Level</h4>
                        {difficultyOptions.map(option => (
                            <label key={option.value} className="ai-option">
                                <input
                                    type="radio"
                                    name="difficulty"
                                    value={option.value}
                                    checked={currentDifficulty === option.value}
                                    onChange={() => {
                                        onDifficultyChange(option.value);
                                        setIsOpen(false);
                                    }}
                                />
                                <div className="ai-option-content">
                                    <strong>{option.label}</strong>
                                    <small>{option.description}</small>
                                </div>
                            </label>
                        ))}
                    </div>
                    
                    <div className="ai-selector-section">
                        <h4>AI Personality</h4>
                        {personalityOptions.map(option => (
                            <label key={option.value} className="ai-option">
                                <input
                                    type="radio"
                                    name="personality"
                                    value={option.value}
                                    checked={currentPersonality === option.value}
                                    onChange={() => {
                                        onPersonalityChange(option.value);
                                        setIsOpen(false);
                                    }}
                                />
                                <div className="ai-option-content">
                                    <strong>{option.label}</strong>
                                    <small>{option.description}</small>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIDifficultySelector;
