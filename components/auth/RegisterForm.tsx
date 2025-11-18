import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Cargo, StatusUsuario, Materia } from '../../types';
import { EyeIcon, EyeSlashIcon, RegisterUserIcon, RegisterEmailIcon, RegisterPhoneIcon, RegisterRoleIcon, RegisterLockIcon } from '../icons/Icons';

interface RegisterFormProps {
    onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [telefone, setTelefone] = useState('');
    const [cargo, setCargo] = useState<Cargo | ''>(''); 
    const [materias, setMaterias] = useState<Materia[]>([]);
    const [selectedMaterias, setSelectedMaterias] = useState<number[]>([]);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const fetchMaterias = async () => {
            const { data, error } = await supabase
                .from('materias')
                .select('id, nome')
                .order('nome', { ascending: true });
            
            if (isCancelled) return;

            if (error) {
                console.error("Erro ao carregar matérias:", error.message);
            } else if (data) {
                setMaterias(data);
            }
        };
        
        fetchMaterias();

        return () => {
            isCancelled = true;
        };
    }, []);

    const formatTelefone = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{0,2})(\d{0,1})(\d{0,4})(\d{0,4})$/);
        if (!match) return '';
        let formatted = '';
        if (match[1]) formatted += `(${match[1]}`;
        if (match[2]) formatted += `) ${match[2]}`;
        if (match[3]) formatted += ` ${match[3]}`;
        if (match[4]) formatted += `-${match[4]}`;
        return formatted;
    };
    
    const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTelefone(formatTelefone(e.target.value));
    };

    const handleMateriaChange = (materiaId: number) => {
        setSelectedMaterias(prev => 
            prev.includes(materiaId) 
            ? prev.filter(id => id !== materiaId)
            : [...prev, materiaId]
        );
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }
        if (!cargo) {
            setError("Por favor, selecione um cargo.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signUpError) throw signUpError;
            if (!signUpData.user) throw new Error("O registro falhou, nenhum usuário foi retornado.");

            const { error: profileError } = await supabase.from('usuarios').insert({
                id: signUpData.user.id,
                nome,
                email,
                telefone: telefone.replace(/\D/g, ''),
                cargo,
                status: StatusUsuario.PENDENTE,
            });

            if (profileError) throw profileError;

            if (cargo === Cargo.PROFESSOR && selectedMaterias.length > 0) {
                const professorMaterias = selectedMaterias.map(materiaId => ({
                    id_professor: signUpData.user.id,
                    id_materia: materiaId,
                }));
                const { error: materiasError } = await supabase.from('professores_materias').insert(professorMaterias);
                if (materiasError) throw materiasError;
            }

            alert("Registro bem-sucedido! Verifique seu e-mail para confirmação.");
            onSwitchToLogin();

        } catch (err: any) {
            if (isMounted.current) {
                setError(err.message);
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    };


    return (
        <div className="p-8 bg-white rounded-2xl shadow-lg">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Crie sua Conta</h2>
            <p className="text-center text-gray-500 mb-8">É rápido e fácil.</p>
            {error && <p className="mb-4 text-center text-red-500 bg-red-100 p-2 rounded">{error}</p>}
            
            <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <RegisterUserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Digite seu nome completo" className="w-full pl-12 pr-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500" />
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <RegisterEmailIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" className="w-full pl-12 pr-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500" />
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <RegisterPhoneIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="tel" value={telefone} onChange={handleTelefoneChange} placeholder="(00) 0 0000-0000" maxLength={16} className="w-full pl-12 pr-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500" />
                </div>
                
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <RegisterRoleIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <select value={cargo} onChange={e => setCargo(e.target.value as Cargo)} required className="w-full pl-12 pr-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none">
                        <option value="" disabled>Selecione seu cargo</option>
                        {Object.values(Cargo).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {cargo === Cargo.PROFESSOR && (
                    <div className="p-4 border border-gray-200 rounded-md bg-[#f6f6f6]">
                        <label className="block text-sm font-medium text-black mb-2">Matérias que leciona:</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 max-h-40 overflow-y-auto">
                            {materias.map(materia => (
                                <label key={materia.id} className="flex items-center space-x-2 text-sm text-gray-700">
                                    <input type="checkbox" checked={selectedMaterias.includes(materia.id)} onChange={() => handleMateriaChange(materia.id)} className="rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
                                    <span>{materia.nome}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <RegisterLockIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Crie uma senha" className="w-full pl-12 pr-10 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                        {showPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}
                    </button>
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <RegisterLockIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirme sua senha" className="w-full pl-12 pr-10 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                        {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}
                    </button>
                </div>
                
                <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed">
                    {loading ? 'Registrando...' : 'Registrar'}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-600">
                Já tem uma conta?{' '}
                <button onClick={onSwitchToLogin} className="font-medium text-blue-600 hover:text-blue-500">
                    Faça login
                </button>
            </p>
        </div>
    );
};

export default RegisterForm;