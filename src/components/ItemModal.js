
import React from 'react';

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalContentStyle = {
  backgroundColor: '#fff',
  padding: '2rem',
  borderRadius: '8px',
  width: '90%',
  maxWidth: '500px',
  color: '#000',
};

const buttonStyle = {
  marginRight: '1rem',
  padding: '0.5rem 1rem',
  border: 'none',
  borderRadius: '5px',
  backgroundColor: '#61dafb',
  cursor: 'pointer',
};

const ItemModal = ({ item, type, onClose, onConsume }) => {
  if (!item) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h2>{item.name}</h2>
        {type === 'ingredient' ? (
          <>
            <h3>Known Effects</h3>
            {item.effects && item.effects.length > 0 ? (
              <ul>
                {item.effects.map((eff, idx) => (
                  <li key={idx}>
                    <strong>{eff.title}</strong>: {eff.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No known effects.</p>
            )}
          </>
        ) : (
          <>
            <h3>Potion Details</h3>
            <p>
              <strong>Description:</strong> {item.description || 'No description available.'}
            </p>
            <p>
              <strong>Duration:</strong> {item.duration}
            </p>
            <p>
              <strong>Brew Level:</strong> {item.brewLevel || 'Not set'}
            </p>
            <p>
              <strong>Bonus Dice:</strong> {item.dice && item.dice.trim() !== '' ? item.dice : 'None'}
            </p>
            {item.effects && item.effects.length > 0 && (
              <>
                <h4>Effects:</h4>
                <ul>
                  {item.effects.map((eff, idx) => (
                    <li key={idx}>
                      <strong>{eff.title}</strong>: {eff.description}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        <div style={{ marginTop: '1rem' }}>
          <button onClick={onConsume} style={buttonStyle}>
            Consume
          </button>
          <button onClick={onClose} style={buttonStyle}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemModal;
