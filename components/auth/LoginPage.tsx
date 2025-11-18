import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const LoginPage: React.FC = () => {
    const [isRegistering, setIsRegistering] = useState(false);

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#f6f6f6] px-4">
            <div className="w-full max-w-xl">
                {isRegistering ? (
                    <RegisterForm onSwitchToLogin={() => setIsRegistering(false)} />
                ) : (
                    <LoginForm onSwitchToRegister={() => setIsRegistering(true)} />
                )}
            </div>
        </div>
    );
};

export default LoginPage;