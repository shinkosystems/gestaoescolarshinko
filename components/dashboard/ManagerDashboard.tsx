import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Turma, Cargo, TipoTurma } from '../../types';
import KPI from './KPI';
import { UserIcon, BookOpenIcon, AcademicCapIcon } from '../icons/Icons';

interface Stats {
    professores: number;
    turmas: number;
    materias: number;
}

const ManagerDashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [professoresRes, turmasRes, materiasRes, turmasListRes] = await Promise.all([
                    supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('cargo', Cargo.PROFESSOR),
                    supabase.from('turmas').select('id', { count: 'exact', head: true }),
                    supabase.from('materias').select('id', { count: 'exact', head: true }),
                    supabase.from('turmas').select('id, nome, tipo').order('nome')
                ]);
                
                if (professoresRes.error) throw professoresRes.error;
                if (turmasRes.error) throw turmasRes.error;
                if (materiasRes.error) throw materiasRes.error;
                if (turmasListRes.error) throw turmasListRes.error;

                setStats({
                    professores: professoresRes.count || 0,
                    turmas: turmasRes.count || 0,
                    materias: materiasRes.count || 0,
                });

                const processedTurmas = (turmasListRes.data || []).map(t => ({
                    ...t,
                    tipo: String(t.tipo).toLowerCase() === 'integral' ? TipoTurma.INTEGRAL : TipoTurma.PARCIAL
                }));
                setTurmas(processedTurmas as Turma[] || []);

            } catch (err: any) {
                setError('Falha ao carregar dados do dashboard: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-10">
                <div className="w-8 h-8 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard Gerencial</h1>
                <p className="text-gray-600 mt-1">Visão geral da sua instituição.</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPI icon={<UserIcon />} title="Total de Professores" value={stats?.professores ?? 0} color="blue" />
                <KPI icon={<AcademicCapIcon />} title="Total de Turmas" value={stats?.turmas ?? 0} color="green" />
                <KPI icon={<BookOpenIcon />} title="Total de Matérias" value={stats?.materias ?? 0} color="purple" />
            </div>

            {/* Turmas list */}
            <div className="bg-white shadow-md rounded-lg">
                 <div className="p-5 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Turmas Cadastradas</h2>
                    <p className="text-sm text-gray-500 mt-1">A funcionalidade de "Gerar Horários" estará disponível em breve.</p>
                </div>
                {turmas.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {turmas.map(turma => (
                            <li key={turma.id} className="px-5 py-3 flex justify-between items-center">
                                <span className="font-medium text-gray-800">{turma.nome}</span>
                                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${String(turma.tipo).toLowerCase() === 'integral' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{turma.tipo}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="p-5 text-center text-gray-500">Nenhuma turma cadastrada.</p>
                )}
            </div>
        </div>
    );
};

export default ManagerDashboard;