import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import TopNav from '../layout/TopNav';
import Drawer from '../layout/Drawer';
import { Usuario } from '../../types';
import SubjectsPage from '../subjects/SubjectsPage';
import CollaboratorsPage from '../collaborators/CollaboratorsPage';
import ProfilePage from '../profile/ProfilePage';
import TurmasPage from '../classes/TurmasPage';
import AppointmentsPage from '../appointments/AppointmentsPage';
import Dashboard from '../dashboard/Dashboard';
import GenerateTimetablePage from '../timetable/GenerateTimetablePage';
import SchedulesPage from '../schedules/SchedulesPage';

interface HomePageProps {
    session: Session;
    userProfile: Usuario;
    onProfileUpdate: (options?: { refreshSession?: boolean }) => void;
}

const HomePage: React.FC<HomePageProps> = ({ session, userProfile, onProfileUpdate }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState('dashboard');

    const renderPage = () => {
        switch (currentPage) {
            case 'materias':
                return <SubjectsPage userProfile={userProfile} onNavigateBack={() => setCurrentPage('dashboard')} />;
            case 'colaboradores':
                return <CollaboratorsPage userProfile={userProfile} onNavigateBack={() => setCurrentPage('dashboard')} />;
            case 'turmas':
                return <TurmasPage userProfile={userProfile} onNavigateBack={() => setCurrentPage('dashboard')} />;
            case 'compromissos':
                return <AppointmentsPage userProfile={userProfile} onNavigateBack={() => setCurrentPage('dashboard')} />;
            case 'gerar-horario':
                return <GenerateTimetablePage userProfile={userProfile} onNavigateBack={() => setCurrentPage('dashboard')} />;
            case 'horarios':
                return <SchedulesPage userProfile={userProfile} onNavigateBack={() => setCurrentPage('dashboard')} />;
            case 'profile':
                return <ProfilePage userProfile={userProfile} onProfileUpdate={onProfileUpdate} onNavigateBack={() => setCurrentPage('dashboard')} />;
            case 'dashboard':
            default:
                return <Dashboard userProfile={userProfile} />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#f6f6f6]">
            <TopNav 
                onMenuClick={() => setIsDrawerOpen(true)} 
                user={session.user} 
                userProfile={userProfile}
                onNavigate={setCurrentPage} 
            />
            
            <div className="flex flex-1 overflow-hidden relative">
                <Drawer 
                    isOpen={isDrawerOpen} 
                    onClose={() => setIsDrawerOpen(false)} 
                    onNavigate={(page) => {
                        setCurrentPage(page);
                        if (window.innerWidth < 768) { 
                          setIsDrawerOpen(false);
                        }
                    }}
                />
                
                <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#f6f6f6] overflow-y-auto">
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

export default HomePage;