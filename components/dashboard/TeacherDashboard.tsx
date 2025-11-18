import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { Usuario, HorarioGerado } from '../../types';
import { BookOpenIcon } from '../icons/Icons';

interface TeacherDashboardProps {
    userProfile: Usuario;
}

const dayMap: { [key: string]: string } = {
    'Monday': 'Segunda-feira',
    'Tuesday': 'Terça-feira',
    'Wednesday': 'Quarta-feira',
    'Thursday': 'Quinta-feira',
    'Friday': 'Sexta-feira',
    'Saturday': 'Segunda-feira', 
    'Sunday': 'Segunda-feira'   
};

const normalizeDayMap: { [key: string]: string } = {
    'Segunda': 'Segunda-feira',
    'Terca': 'Terça-feira',
    'Quarta': 'Quarta-feira',
    'Quinta': 'Quinta-feira',
    'Sexta': 'Sexta-feira',
};

const diasDaSemanaParaTabs = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

const getCurrentBrasiliaDay = (): string => {
    const dayNameEn = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long' });
    return dayMap[dayNameEn] || 'Segunda-feira';
};

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ userProfile }) => {
    const [weeklySchedule, setWeeklySchedule] = useState<HorarioGerado[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>(() => getCurrentBrasiliaDay());

    useEffect(() => {
        const fetchWeeklySchedule = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('horarios_gerados')
                    .select('*, materias(nome), turmas(nome)')
                    .eq('id_professor', userProfile.id);

                if (fetchError) throw fetchError;

                setWeeklySchedule((data as HorarioGerado[]) || []);
            } catch (err: any) {
                setError('Falha ao carregar sua agenda semanal: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchWeeklySchedule();
    }, [userProfile.id]);

    const scheduleByDay = useMemo(() => {
        const grouped: { [key: string]: HorarioGerado[] } = {};
        for (const dia of diasDaSemanaParaTabs) {
            grouped[dia] = [];
        }

        weeklySchedule.forEach(aula => {
            const longDayName = normalizeDayMap[aula.dia_da_semana] || aula.dia_da_semana;
            if (grouped[longDayName]) {
                grouped[longDayName].push(aula);
            }
        });
        
        for (const day in grouped) {
            grouped[day].sort((a, b) => a.horario_inicio.localeCompare(b.horario_inicio));
        }

        return grouped;
    }, [weeklySchedule]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Olá, {userProfile.nome.split(' ')[0]}!</h1>
                <p className="text-gray-600 mt-1">Bem-vindo(a) à sua agenda semanal.</p>
            </div>
            
            <div className="bg-white shadow-md rounded-lg">
                <div className="p-5 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Minha Agenda Semanal</h2>
                    <div className="mt-4 border-b border-gray-200">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                            {diasDaSemanaParaTabs.map(day => (
                                <button
                                    key={day}
                                    onClick={() => setActiveTab(day)}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === day
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="text-center text-gray-500">Carregando agenda...</div>
                    ) : error ? (
                        <div className="text-center text-red-500 bg-red-100 rounded-md p-3">{error}</div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {scheduleByDay[activeTab] && scheduleByDay[activeTab].length > 0 ? (
                                scheduleByDay[activeTab].map(aula => (
                                    <li key={aula.id} className="py-4 flex items-center space-x-4">
                                        <div className="p-2 rounded-full bg-blue-100">
                                            <BookOpenIcon className="h-5 w-5 text-blue-600"/>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">
                                                {aula.materias?.nome || 'Matéria desconhecida'}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Turma: {aula.turmas?.nome || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-800">
                                                {aula.horario_inicio.substring(0, 5)} - {aula.horario_fim.substring(0, 5)}
                                            </p>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="py-4 text-center text-gray-500">Nenhuma aula para este dia.</li>
                            )}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;