import { createPortal } from 'react-dom';

// Renders outside the smooth-scroll layer so fixed positioning behaves.
export default function Portal({ children }) {
  return createPortal(children, document.body);
}
