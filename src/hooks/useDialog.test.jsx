// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useDialog } from './useDialog';
import SearchableDropdown from '../components/SearchableDropdown';

function Dialog({ label, onClose, children }) {
  const ref = useDialog({ onClose });
  return (
    <div ref={ref} role="dialog" aria-label={label}>
      <button type="button">{label} first</button>
      {children}
      <button type="button">{label} last</button>
    </div>
  );
}

function Page({ onOuter = () => {}, onInner = () => {} }) {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOuter(true)}>Open</button>
      {outer && (
        <Dialog label="Outer" onClose={() => { onOuter(); setOuter(false); }}>
          <button type="button" onClick={() => setInner(true)}>Open inner</button>
          {inner && <Dialog label="Inner" onClose={() => { onInner(); setInner(false); }} />}
        </Dialog>
      )}
    </>
  );
}

afterEach(cleanup);

describe('useDialog', () => {
  it('moves focus in, locks the page, and gives focus back on close', () => {
    render(<Page />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Outer first' }));
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('');
  });

  it('closes only the top dialog on Escape', () => {
    const onOuter = vi.fn();
    const onInner = vi.fn();
    render(<Page onOuter={onOuter} onInner={onInner} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const openInner = screen.getByRole('button', { name: 'Open inner' });
    openInner.focus();
    fireEvent.click(openInner);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onInner).toHaveBeenCalledTimes(1);
    expect(onOuter).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeTruthy();
    expect(document.activeElement).toBe(openInner);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOuter).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps Tab inside the dialog', () => {
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const first = screen.getByRole('button', { name: 'Outer first' });
    const last = screen.getByRole('button', { name: 'Outer last' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('keeps an autoFocus field focused and still gives focus back to the opener', () => {
    function Form({ onClose }) {
      const ref = useDialog({ onClose });
      return (
        <div ref={ref} role="dialog" aria-label="Form">
          <button type="button">Cancel</button>
          <input aria-label="Name" autoFocus />
        </div>
      );
    }
    function FormPage() {
      const [shown, setShown] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setShown(true)}>Add</button>
          {shown && <Form onClose={() => setShown(false)} />}
        </>
      );
    }
    render(<FormPage />);
    const opener = screen.getByRole('button', { name: 'Add' });
    opener.focus();
    fireEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('ignores Escape when the notice has to be answered', () => {
    function Notice() {
      const ref = useDialog();
      return <div ref={ref} role="dialog" aria-label="Notice"><button type="button">I understand</button></div>;
    }
    render(<Notice />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Notice' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'I understand' }));
  });
});

describe('SearchableDropdown inside a dialog', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Bravo' },
    { value: 'c', label: 'Charlie' },
  ];

  function Sheet({ onClose, onChange }) {
    const ref = useDialog({ onClose });
    return (
      <div ref={ref} role="dialog" aria-label="Sheet">
        <SearchableDropdown label="Glove" options={options} value="a" onChange={onChange} />
      </div>
    );
  }

  it('picks with the arrow keys and Enter', () => {
    const onChange = vi.fn();
    render(<Sheet onClose={() => {}} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Glove: Alpha' }));
    const box = screen.getByRole('combobox', { name: 'Glove' });
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('closes the list on Escape and leaves the sheet open', () => {
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Glove: Alpha' }));
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Glove' }), { key: 'Escape' });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
