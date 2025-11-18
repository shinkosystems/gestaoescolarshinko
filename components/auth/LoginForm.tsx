import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { EyeIcon, EyeSlashIcon } from '../icons/Icons';
import { Logo } from '../common/Logo';

interface LoginFormProps {
    onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };
    
    const handlePasswordReset = async () => {
        if (!email) {
            setError("Por favor, insira seu e-mail para redefinir a senha.");
            return;
        }
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) {
            setError(error.message);
        } else {
            setMessage("Um link para redefinição de senha foi enviado para o seu e-mail.");
        }
        setLoading(false);
    };

    return (
        <div className="p-8 bg-white rounded-2xl shadow-lg transition-transform transform hover:scale-105">
            <div className="flex justify-center mb-4">
                <Logo className="h-20 w-20" />
            </div>
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Gestão Escolar</h2>
            <p className="text-center text-gray-500 mb-8">Sua escola dentro do seu app!</p>

            {error && <p className="mb-4 text-center text-red-500 bg-red-100 p-2 rounded">{error}</p>}
            {message && <p className="mb-4 text-center text-green-500 bg-green-100 p-2 rounded">{message}</p>}

            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1 block w-full px-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="seu@email.com"
                    />
                </div>
                <div className="relative">
                    <label htmlFor="password"  className="block text-sm font-medium text-gray-700">Senha</label>
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="mt-1 block w-full px-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="********"
                    />
                     <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-sm leading-5"
                    >
                        {showPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}
                    </button>
                </div>
                <div className="text-right">
                    <button type="button" onClick={handlePasswordReset} className="text-sm text-blue-600 hover:underline">Esqueceu sua senha?</button>
                </div>
                <div>
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed">
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </div>
            </form>
            <p className="mt-8 text-center text-sm text-gray-600">
                Não tem uma conta?{' '}
                <button onClick={onSwitchToRegister} className="font-medium text-blue-600 hover:text-blue-500">
                    Registre-se
                </button>
            </p>
        </div>
    );
};

export default LoginForm;