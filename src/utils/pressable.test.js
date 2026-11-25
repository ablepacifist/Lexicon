import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import pressable from './pressable';

function Card({ onOpen, onDelete }) {
  return (
    <div {...pressable(onOpen)} aria-label="Road trip playlist">
      Road trip
      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}>Delete</button>
    </div>
  );
}

test('a card is a focusable button that Enter and Space activate', () => {
  const onOpen = jest.fn();
  render(<Card onOpen={onOpen} onDelete={() => {}} />);
  const card = screen.getByRole('button', { name: 'Road trip playlist' });
  expect(card).toHaveAttribute('tabindex', '0');
  fireEvent.keyDown(card, { key: 'Enter' });
  fireEvent.keyDown(card, { key: ' ' });
  fireEvent.click(card);
  expect(onOpen).toHaveBeenCalledTimes(3);
});

test('keys pressed on a control inside the card stay with that control', () => {
  const onOpen = jest.fn();
  const onDelete = jest.fn();
  render(<Card onOpen={onOpen} onDelete={onDelete} />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Delete' }), { key: 'Enter' });
  expect(onOpen).not.toHaveBeenCalled();
});
