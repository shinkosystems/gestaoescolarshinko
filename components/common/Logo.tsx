import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
    <img 
        src="/logo.png" 
        alt="Logo Gestão Escolar" 
        className={className} 
    />
);