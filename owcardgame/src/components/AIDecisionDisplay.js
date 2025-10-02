import React, { useState, useEffect } from 'react';

const AIDecisionDisplay = ({ decision, isVisible = false }) => {
    const [displayText, setDisplayText] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (decision && isVisible) {
            setIsTyping(true);
            setDisplayText('');
            
            // Type out the decision reasoning
            let index = 0;
            const typeInterval = setInterval(() => {
                if (index < decision.reasoning.length) {
                    setDisplayText(decision.reasoning.substring(0, index + 1));
                    index++;
                } else {
                    setIsTyping(false);
                    clearInterval(typeInterval);
                }
            }, 50); // 50ms per character

            return () => clearInterval(typeInterval);
        }
    }, [decision, isVisible]);

    if (!isVisible || !decision) return null;

    return (
        <div className="ai-decision-display">
            <div className="ai-thinking-indicator">
                {isTyping ? '🤔 AI is thinking...' : '✅ AI decision made'}
            </div>
            <div className="ai-decision-text">
                {displayText}
                {isTyping && <span className="ai-cursor">|</span>}
            </div>
            {decision.type !== 'wait' && (
                <div className="ai-action-details">
                    <strong>Action:</strong> {decision.type.replace('_', ' ').toUpperCase()}
                    {decision.card && <div><strong>Card:</strong> {decision.card.name}</div>}
                    {decision.row && <div><strong>Row:</strong> {decision.row}</div>}
                    {decision.ability && <div><strong>Ability:</strong> {decision.ability}</div>}
                </div>
            )}
        </div>
    );
};

export default AIDecisionDisplay;
