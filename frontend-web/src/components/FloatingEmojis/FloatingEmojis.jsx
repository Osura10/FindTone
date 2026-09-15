import React from 'react';
import './FloatingEmojis.css';

const emojis = ['🎸', '🎹', '🥁', '🎷', '🎻', '🎺', '🪕', '🎤'];

const FloatingEmojis = () => {
  return (
    <div className="floating-emojis-container">
      {emojis.map((emoji, index) => (
        <span key={index} className={`floating-emoji emoji-${index + 1}`}>
          {emoji}
        </span>
      ))}
    </div>
  );
};

export default FloatingEmojis;
