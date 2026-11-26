import React from 'react';
import Dialog from './Dialog';

/** An ingredient's or potion's details, with the action to consume it. */
const ItemModal = ({ item, type, onClose, onConsume, busy = false }) => {
  if (!item) return null;
  const effects = Array.isArray(item.effects) ? item.effects : [];

  return (
    <Dialog
      title={item.name}
      onClose={onClose}
      actions={(
        <>
          <button type="button" className="lx-btn lx-btn--secondary" onClick={onClose}>Close</button>
          <button type="button" className="lx-btn lx-btn--primary" onClick={onConsume} disabled={busy}>
            {type === 'ingredient' ? 'Eat' : 'Drink'}
          </button>
        </>
      )}
    >
      {type === 'ingredient' ? (
        <>
          <h3 className="item-modal__heading">Known effects</h3>
          {effects.length > 0 ? (
            <ul className="item-modal__list">
              {effects.map((eff, idx) => (
                <li key={idx}><strong>{eff.title}</strong>: {eff.description}</li>
              ))}
            </ul>
          ) : (
            <p>You haven't discovered any of its effects yet.</p>
          )}
        </>
      ) : (
        <>
          <p>{item.description || 'No description available.'}</p>
          <dl className="item-modal__facts">
            <dt>Duration</dt><dd>{item.duration || '—'}</dd>
            <dt>Brew level</dt><dd>{item.brewLevel || 'Not set'}</dd>
            <dt>Bonus dice</dt><dd>{item.dice && item.dice.trim() !== '' ? item.dice : 'None'}</dd>
          </dl>
          {effects.length > 0 && (
            <>
              <h3 className="item-modal__heading">Effects</h3>
              <ul className="item-modal__list">
                {effects.map((eff, idx) => (
                  <li key={idx}><strong>{eff.title}</strong>: {eff.description}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Dialog>
  );
};

export default ItemModal;
