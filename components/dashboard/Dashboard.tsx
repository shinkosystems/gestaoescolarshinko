import React from 'react';
import { Usuario, Cargo } from '../../types';
import ManagerDashboard from './ManagerDashboard';
import TeacherDashboard from './TeacherDashboard';

interface DashboardProps {
    userProfile: Usuario;
}

const Dashboard: React.FC<DashboardProps> = ({ userProfile }) => {
    const isManager = [Cargo.DIRETOR, Cargo.VICE_DIRETOR, Cargo.SUPERVISOR].includes(userProfile.cargo);
    
    if (isManager) {
        return <ManagerDashboard />;
    }
    
    return <TeacherDashboard userProfile={userProfile} />;
};

export default Dashboard;