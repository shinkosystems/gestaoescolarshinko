import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import LoginPage from './components/auth/LoginPage';
import HomePage from './components/home/HomePage';
import { Usuario } from './types';

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = useCallback(async (user: any) => {
        if (user) {
            const { data: profile } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', user.id)
                .single();
            setUserProfile(profile || null);
        } else {
            setUserProfile(null);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            await fetchUserProfile(session?.user);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [fetchUserProfile]);

    const handleProfileUpdate = useCallback(async (options: { refreshSession?: boolean } = {}) => {
        if (session?.user) {
            await fetchUserProfile(session.user);
            
            if (options.refreshSession) {
                const { data } = await supabase.auth.refreshSession();
                if (data.session) {
                    setSession(data.session);
                }
            }
        }
    }, [session, fetchUserProfile]);


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f6f6f6]">
                <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {!session || !userProfile ? <LoginPage /> : <HomePage key={session.user.id} session={session} userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />}
        </div>
    );
};

export default App;