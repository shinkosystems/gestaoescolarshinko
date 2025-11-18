import React from 'react';
import { CloseIcon, ChartLineIcon, UserIcon, BookOpenIcon, ClockIcon, TurmasIcon, CompromissosIcon, HorariosIcon } from '../icons/Icons';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: string) => void;
}

const NavLink: React.FC<{ children: React.ReactNode; onClick: () => void; icon?: React.ReactNode }> = ({ children, onClick, icon }) => (
    <button onClick={onClick} className="w-full text-left flex items-center p-3 text-base font-medium text-gray-600 rounded-lg hover:bg-[#f6f6f6] hover:text-gray-900 transition-colors duration-200">
        {icon && <span className="mr-3 text-gray-500">{icon}</span>}
        {children}
    </button>
);


const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, onNavigate }) => {
    return (
        <>
            {/* Overlay for mobile */}
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>
            
            <aside className={`fixed top-0 left-0 z-40 w-64 h-screen md:h-full bg-white text-gray-800 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.1),2px_0_4px_-2px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:flex-shrink-0`}>
                
                <nav className="p-4">
                    <ul className="space-y-2">
                        <li><NavLink onClick={() => onNavigate('dashboard')} icon={<ChartLineIcon className="w-5 h-5"/>}>Dashboard</NavLink></li>
                        <li><NavLink onClick={() => onNavigate('colaboradores')} icon={<UserIcon className="w-5 h-5"/>}>Colaboradores</NavLink></li>
                        <li><NavLink onClick={() => onNavigate('turmas')} icon={<TurmasIcon className="w-5 h-5"/>}>Turmas</NavLink></li>
                        <li><NavLink onClick={() => onNavigate('materias')} icon={<BookOpenIcon className="w-5 h-5"/>}>Matérias</NavLink></li>
                        <li><NavLink onClick={() => onNavigate('compromissos')} icon={<CompromissosIcon className="w-5 h-5"/>}>Compromissos</NavLink></li>
                        <li><NavLink onClick={() => onNavigate('gerar-horario')} icon={<ClockIcon className="w-5 h-5"/>}>Gerar Horário</NavLink></li>
                        <li><NavLink onClick={() => onNavigate('horarios')} icon={<HorariosIcon className="w-5 h-5"/>}>Horários</NavLink></li>
                    </ul>
                </nav>
            </aside>
        </>
    );
};

export default Drawer;