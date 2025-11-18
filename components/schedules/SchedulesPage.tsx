import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { Usuario, Turma, HorarioGerado, Cargo, Materia } from '../../types';
import { ChevronLeftIcon } from '../icons/Icons';
import TimetableGrid from '../timetable/TimetableGrid';

interface SchedulesPageProps {
    userProfile: Usuario;
    onNavigateBack: () => void;
}

const SchedulesPage: React.FC<SchedulesPageProps> = ({ userProfile, onNavigateBack }) => {
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
    const [schedule, setSchedule] = useState<HorarioGerado[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showMyScheduleOnly, setShowMyScheduleOnly] = useState(false);
    
    const [allMaterias, setAllMaterias] = useState<Materia[]>([]);
    const [allProfessors, setAllProfessors] = useState<Usuario[]>([]);

    const isProfessor = userProfile.cargo === Cargo.PROFESSOR;

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const turmasPromise = supabase.from('turmas').select('*').eq('horario_gerado', true).order('nome');
            const materiasPromise = supabase.from('materias').select('*');
            const professorsPromise = supabase.from('usuarios').select('*').eq('cargo', Cargo.PROFESSOR);
            
            const [turmasRes, materiasRes, professorsRes] = await Promise.all([turmasPromise, materiasPromise, professorsPromise]);

            if (turmasRes.error) throw turmasRes.error;
            if (materiasRes.error) throw materiasRes.error;
            if (professorsRes.error) throw professorsRes.error;

            setTurmas(turmasRes.data as Turma[] || []);
            setAllMaterias(materiasRes.data || []);
            setAllProfessors(professorsRes.data || []);

        } catch (err: any) {
            setError('Falha ao carregar dados: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        const fetchScheduleForTurma = async () => {
            if (!selectedTurmaId) {
                setSchedule([]);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('horarios_gerados')
                    .select('*')
                    .eq('id_turma', selectedTurmaId);

                if (fetchError) throw fetchError;
                
                const enrichedSchedule = (data || []).map(item => ({
                    ...item,
                    materias: allMaterias.find(m => m.id === item.id_materia),
                    usuarios: allProfessors.find(p => p.id === item.id_professor),
                }));
                setSchedule(enrichedSchedule as HorarioGerado[]);
            } catch (err: any) {
                setError('Falha ao carregar horário da turma: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchScheduleForTurma();
    }, [selectedTurmaId, allMaterias, allProfessors]);

    const selectedTurma = useMemo(() => {
        const foundTurma = turmas.find(t => t.id === Number(selectedTurmaId));
        if (foundTurma) {
            return {
                ...foundTurma,
                tipo: String(foundTurma.tipo).toLowerCase() === 'integral' ? 'Integral' : 'Parcial'
            } as Turma;
        }
        return null;
    }, [selectedTurmaId, turmas]);
    
    const filteredSchedule = useMemo(() => {
        if (isProfessor && showMyScheduleOnly) {
            return schedule.filter(item => item.id_professor === userProfile.id);
        }
        return schedule;
    }, [schedule, isProfessor, showMyScheduleOnly, userProfile.id]);


    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                <button onClick={onNavigateBack} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Voltar">
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <span>Consultar Horários</span>
            </h1>

            <div className="bg-white shadow-md rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <label htmlFor="turma-select-view" className="sr-only">Selecione uma Turma</label>
                        <select
                            id="turma-select-view"
                            value={selectedTurmaId}
                            onChange={(e) => setSelectedTurmaId(e.target.value)}
                            className="w-full sm:w-auto px-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={loading}
                        >
                            <option value="">{loading ? 'Carregando...' : turmas.length > 0 ? 'Selecione uma turma' : 'Nenhuma turma com horário'}</option>
                            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                    </div>

                    {isProfessor && (
                        <div className="flex items-center">
                            <label htmlFor="schedule-filter-toggle" className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input
                                        id="schedule-filter-toggle"
                                        type="checkbox"
                                        className="sr-only"
                                        checked={showMyScheduleOnly}
                                        onChange={e => setShowMyScheduleOnly(e.target.checked)}
                                    />
                                    <div className={`block w-12 h-6 rounded-full transition-colors ${showMyScheduleOnly ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showMyScheduleOnly ? 'transform translate-x-6' : ''}`}></div>
                                </div>
                                <span className="ml-3 text-sm font-medium text-gray-700">
                                    Apenas meus horários
                                </span>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-md text-center bg-red-100 text-red-800">
                    {error}
                </div>
            )}
            
            <TimetableGrid turma={selectedTurma} schedule={filteredSchedule} />
        </div>
    );
};

export default SchedulesPage;