import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

function Boom({ explode }) {
  if (explode) throw new Error('list.map is not a function');
  return <p>Shop</p>;
}

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => console.error.mockRestore());

test('a crashing page shows a way out instead of a white screen', () => {
  render(<MemoryRouter><ErrorBoundary resetKey="/pokemon/shop"><Boom explode /></ErrorBoundary></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
});

test('moving to another route clears the error', () => {
  const { rerender } = render(
    <MemoryRouter><ErrorBoundary resetKey="/pokemon/shop"><Boom explode /></ErrorBoundary></MemoryRouter>,
  );
  rerender(<MemoryRouter><ErrorBoundary resetKey="/pokemon/items"><Boom explode={false} /></ErrorBoundary></MemoryRouter>);
  expect(screen.getByText('Shop')).toBeInTheDocument();
});
