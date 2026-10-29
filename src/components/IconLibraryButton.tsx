import React, { useState } from 'react';
import { Button } from './ui/Button';
import { IconLibraryDialog } from './IconLibraryDialog';

interface IconLibraryButtonProps {
  onUse: (side: 'source' | 'target', svg: string) => Promise<void>;
}

// The entry point to the icon libraries: a button that opens the dialog, for any page that loads SVGs.
export const IconLibraryButton: React.FC<IconLibraryButtonProps> = ({ onUse }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Browse icon libraries</Button>
      {isOpen && <IconLibraryDialog onClose={() => setIsOpen(false)} onUse={onUse} />}
    </>
  );
};
