import React from 'react';

interface PixelatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  active?: boolean;
}

const PixelatedButton: React.FC<PixelatedButtonProps> = ({ children, active = false, className, ...props }) => {
  const baseClasses = "text-xs px-4 py-2 bg-black/30 border-2 outline-none focus:outline-none transition-all duration-200 text-cyan-300 hover:text-white";
  const activeClasses = "border-fuchsia-500 shadow-[0_0_10px_0_#f0f] text-white";
  const inactiveClasses = "border-cyan-400 hover:shadow-[0_0_10px_0_#0ff] active:bg-cyan-500/20";
  
  return (
    <button
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default PixelatedButton;