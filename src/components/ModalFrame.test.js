import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ModalFrame from './ModalFrame';
import Dialog from './Dialog';

// A page that keeps the modal's form state itself, as PlaylistManager does, so every
// keystroke re-renders the parent and hands the modal a new inline onClose.
function Page({ Modal }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <label htmlFor="n">Name</label>
          <input id="n" value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="d">Description</label>
          <input id="d" />
        </Modal>
      )}
    </>
  );
}

const Frame = ({ onClose, children }) => (
  <ModalFrame onClose={onClose} overlayClassName="modal-overlay" className="modal-content">
    <h2>Edit playlist</h2>
    {children}
  </ModalFrame>
);
const Styled = ({ onClose, children }) => <Dialog title="Edit playlist" onClose={onClose}>{children}</Dialog>;

describe.each([['ModalFrame', Frame], ['Dialog', Styled]])('%s', (_, Modal) => {
  test('is announced as a dialog named by its heading', () => {
    render(<Page Modal={Modal} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog', { name: 'Edit playlist' })).toBeInTheDocument();
  });

  test('keeps focus where the user is typing while the parent re-renders', () => {
    render(<Page Modal={Modal} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const description = screen.getByLabelText('Description');
    const name = screen.getByLabelText('Name');
    name.focus();
    fireEvent.change(name, { target: { value: 'Road trip' } });
    expect(name).toHaveFocus();
    description.focus();
    fireEvent.change(name, { target: { value: 'Road trip 2' } });
    expect(description).toHaveFocus();
  });

  test('closes on Escape and gives focus back to the opener', () => {
    render(<Page Modal={Modal} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByLabelText('Name')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  test('closes on a press on the backdrop but not inside the panel', () => {
    render(<Page Modal={Modal} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- the backdrop has no role of its own
    fireEvent.mouseDown(dialog.parentElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
