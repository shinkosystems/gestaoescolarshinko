import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import { MenuIcon, UserCircleIcon } from '../icons/Icons';
import { Usuario } from '../../types';
import { Logo } from '../common/Logo';

interface TopNavProps {
    onMenuClick: () => void;
    user: User;
    userProfile: Usuario | null;
    onNavigate: (page: string) => void;
}

const TopNav: React.FC<TopNavProps> = ({ onMenuClick, user, userProfile, onNavigate }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error.message);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="bg-white shadow-md sticky top-0 z-20 w-full">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <button
                            onClick={onMenuClick}
                            className="p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-[#f6f6f6] md:hidden"
                        >
                            <MenuIcon className="h-6 w-6" />
                        </button>
                        <div className="flex items-center ml-4 md:ml-0">
                            <Logo className="h-8 w-8 mr-3" />
                            <h1 className="text-xl font-bold text-gray-800">
                                Gestão Escolar
                            </h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-sm font-bold text-gray-800 leading-tight">{userProfile?.nome}</span>
                            <span className="text-xs text-gray-500 leading-tight">{user.email}</span>
                        </div>
                        
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-2 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500">
                               {user.user_metadata?.avatar_url ? (
                                    <img className="h-9 w-9 rounded-full object-cover" src={user.user_metadata.avatar_url} alt="User avatar" />
                               ) : (
                                    <UserCircleIcon className="h-9 w-9 text-gray-600" />
                               )}
                            </button>
                            {isDropdownOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200 md:hidden">
                                        <p className="font-semibold truncate">{userProfile?.nome}</p>
                                        <p className="truncate text-gray-500">{user.email}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            onNavigate('profile');
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-[#f6f6f6]"
                                    >
                                        Perfil
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-[#f6f6f6]"
                                    >
                                        Sair
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopNav;