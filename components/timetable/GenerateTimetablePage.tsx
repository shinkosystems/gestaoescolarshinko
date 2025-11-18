import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Usuario, Cargo, Turma, HorarioGerado, Materia, TipoTurma } from '../../types';
import { ChevronLeftIcon, SparklesIcon, TrashIcon, CheckIcon, CloseIcon } from '../icons/Icons';
import TimetableGrid from './TimetableGrid';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const GenerateTimetablePage: React.FC<{ userProfile: Usuario; onNavigateBack: () => void; }> = ({ userProfile, onNavigateBack }) => {
  const isAuthorized = [Cargo.DIRETOR, Cargo.VICE_DIRETOR, Cargo.SUPERVISOR].includes(userProfile.cargo);
  const [allData, setAllData] = useState<{ turmas: Turma[], materias: Materia[], professors: Usuario[] }>({ turmas: [], materias: [], professors: [] });
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [schedule, setSchedule] = useState<HorarioGerado[]>([]);
  const [isScheduleSaved, setIsScheduleSaved] = useState(false);
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isLoadingIA, setIsLoadingIA] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'warning', message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const selectedTurma = useMemo(() => {
    return allData.turmas.find(t => t.id === Number(selectedTurmaId)) || null;
  }, [selectedTurmaId, allData.turmas]);

  const fetchData = useCallback(async () => {
    setLoadingInitial(true);
    setError(null);
    try {
      const [turmasRes, materiasRes, professorsRes] = await Promise.all([
          supabase.from('turmas').select(`*, materias_professores:turmas_materias_professores(id_materia, id_professor), materias_aulas:turmas_materias(id_materia, quantidade_aulas)`).order('nome'),
          supabase.from('materias').select('*').order('nome'),
          supabase.from('usuarios').select('*').eq('cargo', Cargo.PROFESSOR).order('nome')
      ]);

      if (turmasRes.error) throw turmasRes.error;
      if (materiasRes.error) throw materiasRes.error;
      if (professorsRes.error) throw professorsRes.error;
      
      const processedTurmas = (turmasRes.data || []).map(turma => {
        const materias_professores: any[] = (turma.materias_aulas || []).map((tm: any) => {
            const profLink = (turma.materias_professores || []).find((tmp: any) => tmp.id_materia === tm.id_materia);
            return {
                id_materia: tm.id_materia,
                quantidade_aulas: tm.quantidade_aulas,
                id_professor: profLink ? profLink.id_professor : '',
            };
        });
        
        const { materias_aulas, ...restOfTurma } = turma;

        return {
            ...restOfTurma,
            tipo: restOfTurma.tipo?.toLowerCase() === 'integral' ? TipoTurma.INTEGRAL : TipoTurma.PARCIAL,
            materias_professores,
        };
      });

      setAllData({
        turmas: processedTurmas as Turma[],
        materias: materiasRes.data || [],
        professors: professorsRes.data || []
      });

    } catch (err: any) {
      setError("Falha ao carregar dados iniciais: " + err.message);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
        fetchData();
    } else {
        setLoadingInitial(false);
    }
  }, [isAuthorized, fetchData]);
  
  useEffect(() => {
    const fetchSavedSchedule = async () => {
        if (!selectedTurmaId) {
            setSchedule([]);
            setIsScheduleSaved(false);
            setNotification(null);
            return;
        }
        const { data, error: fetchError } = await supabase.from('horarios_gerados').select('*').eq('id_turma', selectedTurmaId);
        
        if (fetchError) {
            setError("Erro ao buscar grade salva: " + fetchError.message);
            setSchedule([]);
            setIsScheduleSaved(false);
            return;
        }

        if (data && data.length > 0) {
            const enrichedSchedule = data.map(item => ({
                ...item,
                materias: allData.materias.find(m => m.id === item.id_materia),
                usuarios: allData.professors.find(p => p.id === item.id_professor),
            }));
            setSchedule(enrichedSchedule as HorarioGerado[]);
            setIsScheduleSaved(true);
        } else {
            setSchedule([]);
            setIsScheduleSaved(false);
        }
        setNotification(null);
    };
    fetchSavedSchedule();
  }, [selectedTurmaId, allData]);

  const handleAcionarIA = async () => {
    if (!selectedTurma) return;
    setIsLoadingIA(true);
    setError(null);
    setNotification(null);

    try {
        const professorIds = selectedTurma.materias_professores.map(mp => mp.id_professor).filter(Boolean);
        const { data: compromissos } = await supabase.from('compromissos').select('*').in('id_professor', professorIds);

        const { data: existingSchedules, error: scheduleError } = await supabase
            .from('horarios_gerados')
            .select('id_professor, dia_da_semana, horario_inicio, horario_fim, turmas(nome)')
            .in('id_professor', professorIds)
            .neq('id_turma', selectedTurma.id);

        if (scheduleError) {
            throw new Error(`Erro ao buscar horários existentes: ${scheduleError.message}`);
        }

        const existingSchedulesFormatted = (existingSchedules || []).map((s: any) => ({
            professor: allData.professors.find(p => p.id === s.id_professor)?.nome,
            turma: s.turmas?.nome,
            dia: s.dia_da_semana,
            horario: `${s.horario_inicio.substring(0, 5)} - ${s.horario_fim.substring(0, 5)}`
        }));

        const materiasComProf = selectedTurma.materias_professores.map(mp => {
            const materia = allData.materias.find(m => m.id === mp.id_materia);
            const prof = allData.professors.find(p => p.id === mp.id_professor);
            if (!materia || !prof) return null;
            return { id_materia: mp.id_materia, materia: materia.nome, id_professor: mp.id_professor, professor: prof.nome, aulas_semanais: mp.quantidade_aulas };
        }).filter(Boolean);

        const totalAulasSemanais = materiasComProf.reduce((acc, m) => acc + (m?.aulas_semanais || 0), 0);
        
        const prompt = `
            Você é um especialista em geração de horários escolares. Sua tarefa é criar uma grade horária completa para a turma "${selectedTurma.nome}", seguindo RIGOROSAMENTE as regras abaixo.

            REGRAS OBRIGATÓRIAS:
            1.  **PREENCHIMENTO TOTAL:** A grade deve ter EXATAMENTE ${totalAulasSemanais} aulas. Não pode haver NENHUM horário vago. A soma das aulas semanais das matérias é igual ao total de horários disponíveis.
            2.  **DURAÇÃO DA AULA:** Cada aula dura EXATAMENTE 50 minutos.
            3.  **INTERVALOS:** Nenhuma aula pode ser agendada durante os horários de intervalo ou almoço.
            4.  **LIMITE DIÁRIO:** Cada matéria pode ter no máximo 2 aulas por dia.
            5.  **COMPROMISSOS:** Professores não podem ter aulas durante seus compromissos fixos.
            6.  **OTIMIZAÇÃO:** Se possível, agrupe as aulas de um professor para que ele precise ir à escola o menor número de dias possível.
            7.  **HORÁRIOS JÁ OCUPADOS:** Professores não podem ter aulas alocadas em horários que já estejam ocupados por aulas de outras turmas. A lista de horários já ocupados é fornecida abaixo.

            DADOS DA TURMA:
            - Tipo: ${selectedTurma.tipo}
            - Início das Aulas: ${selectedTurma.horario_inicio}
            - Fim das Aulas: ${selectedTurma.horario_fim}
            - 1º Intervalo: ${selectedTurma.horario_inicio_primeiro_intervalo} - ${selectedTurma.horario_fim_primeiro_intervalo}
            ${selectedTurma.tipo === TipoTurma.INTEGRAL ? `- Almoço: ${selectedTurma.horario_inicio_almoco} - ${selectedTurma.horario_fim_almoco}` : ''}
            ${selectedTurma.tipo === TipoTurma.INTEGRAL ? `- 2º Intervalo: ${selectedTurma.horario_inicio_segundo_intervalo} - ${selectedTurma.horario_fim_segundo_intervalo}` : ''}

            MATÉRIAS, PROFESSORES E CARGA HORÁRIA:
            ${JSON.stringify(materiasComProf, null, 2)}

            COMPROMISSOS FIXOS DOS PROFESSORES (Não agendar aulas nestes horários):
            ${JSON.stringify(compromissos, null, 2)}

            HORÁRIOS DE AULAS JÁ ALOCADOS PARA ESTES PROFESSORES EM OUTRAS TURMAS (Não agendar aulas nestes horários):
            ${JSON.stringify(existingSchedulesFormatted, null, 2)}

            FORMATO DE SAÍDA OBRIGATÓRIO:
            Retorne um array JSON com ${totalAulasSemanais} objetos, cada um no seguinte formato:
            [
              { "id_materia": number, "id_professor": "uuid", "dia_da_semana": "Segunda"|"Terca"|"Quarta"|"Quinta"|"Sexta", "horario_inicio": "HH:mm", "horario_fim": "HH:mm" }
            ]
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id_materia: { type: Type.NUMBER },
                            id_professor: { type: Type.STRING },
                            dia_da_semana: { type: Type.STRING },
                            horario_inicio: { type: Type.STRING },
                            horario_fim: { type: Type.STRING },
                        },
                        required: ["id_materia", "id_professor", "dia_da_semana", "horario_inicio", "horario_fim"],
                    },
                },
            },
        });

        const aiScheduleRaw = JSON.parse(response.text.trim());
        
        if (aiScheduleRaw.length !== totalAulasSemanais) {
            setNotification({ type: 'warning', message: `IA retornou ${aiScheduleRaw.length} aulas, mas esperava ${totalAulasSemanais}. A grade pode estar incompleta.` });
        } else {
            setNotification({ type: 'success', message: `Grade gerada com sucesso com ${aiScheduleRaw.length} aulas!` });
        }

        const fullSchedule = aiScheduleRaw.map((item: any) => ({
            ...item,
            id_turma: selectedTurma.id,
            origem_ia: true,
            materias: allData.materias.find(m => m.id === item.id_materia),
            usuarios: allData.professors.find(p => p.id === item.id_professor),
        }));

        setSchedule(fullSchedule);
        setIsScheduleSaved(false);
    } catch (err: any) {
      setError('Erro ao gerar grade: ' + err.message);
    } finally {
      setIsLoadingIA(false);
    }
  };

  const handleSalvarGrade = async () => {
    if (!selectedTurma || schedule.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
        await supabase.from('horarios_gerados').delete().eq('id_turma', selectedTurma.id);

        const scheduleToInsert = schedule.map(s => ({
            id_turma: s.id_turma,
            id_materia: s.id_materia,
            id_professor: s.id_professor,
            dia_da_semana: s.dia_da_semana,
            horario_inicio: s.horario_inicio,
            horario_fim: s.horario_fim,
            origem_ia: s.origem_ia,
        }));

        const { error: insertError } = await supabase.from('horarios_gerados').insert(scheduleToInsert);
        if (insertError) throw insertError;

        const { error: updateTurmaError } = await supabase
            .from('turmas')
            .update({ horario_gerado: true })
            .eq('id', selectedTurma.id);
        if (updateTurmaError) throw updateTurmaError;

        const updatedTurmas = allData.turmas.map(t => 
            t.id === selectedTurma.id ? { ...t, horario_gerado: true } : t
        );
        setAllData(prev => ({ ...prev, turmas: updatedTurmas }));
        
        setIsScheduleSaved(true);
        setNotification({ type: 'success', message: 'Grade salva com sucesso!' });
    } catch(err: any) {
        setError('Erro ao salvar grade: ' + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleLimparGrade = () => {
    if (isScheduleSaved) {
        setIsDeleteModalOpen(true);
    } else {
        setSchedule([]);
        setNotification(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTurma) return;
    setIsSubmitting(true);
    setError(null);
    try {
        await supabase.from('horarios_gerados').delete().eq('id_turma', selectedTurma.id);

        const { error: updateTurmaError } = await supabase
            .from('turmas')
            .update({ horario_gerado: false })
            .eq('id', selectedTurma.id);
        if (updateTurmaError) throw updateTurmaError;

        const updatedTurmas = allData.turmas.map(t => 
            t.id === selectedTurma.id ? { ...t, horario_gerado: false } : t
        );
        setAllData(prev => ({ ...prev, turmas: updatedTurmas }));

        setSchedule([]);
        setIsScheduleSaved(false);
        setNotification({ type: 'success', message: 'Grade limpa com sucesso.' });
        setIsDeleteModalOpen(false);
    } catch (err: any) {
        setError('Erro ao limpar grade: ' + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (!isAuthorized) {
    return (
        <div className="max-w-7xl mx-auto"><div className="bg-white shadow-md rounded-lg p-6 text-center"><h2 className="text-xl font-bold text-red-600">Acesso Negado</h2><p className="text-gray-700 mt-2">Você não tem permissão para visualizar esta página.</p></div></div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <button onClick={onNavigateBack} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Voltar">
                <ChevronLeftIcon className="h-6 w-6" />
            </button>
            <span>Gerar Horário</span>
        </h1>

        <div className="bg-white shadow-md rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <div className="flex-1 min-w-0">
                    <label htmlFor="turma-select" className="sr-only">Selecione uma Turma</label>
                    <select
                        id="turma-select"
                        value={selectedTurmaId}
                        onChange={(e) => setSelectedTurmaId(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loadingInitial}
                    >
                        <option value="">{loadingInitial ? 'Carregando turmas...' : 'Selecione uma turma'}</option>
                        {allData.turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                 </div>
                 <div className="flex items-center justify-end space-x-2 flex-wrap gap-2">
                    <button onClick={handleAcionarIA} disabled={!selectedTurmaId || isLoadingIA} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">
                        <SparklesIcon className="w-5 h-5"/>
                        {isLoadingIA ? 'Gerando...' : 'Acionar IA'}
                    </button>
                    <button onClick={handleLimparGrade} disabled={schedule.length === 0} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
                        <TrashIcon className="w-5 h-5" />
                        Limpar Grade
                    </button>
                    <button onClick={handleSalvarGrade} disabled={schedule.length === 0 || isScheduleSaved || isSubmitting} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed">
                        <CheckIcon className="w-5 h-5" />
                        {isSubmitting ? 'Salvando...' : 'Salvar Grade'}
                    </button>
                 </div>
            </div>
        </div>

        {notification && (
            <div className={`p-3 rounded-md text-center ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {notification.message}
            </div>
        )}

        {error && (
            <div className="p-3 rounded-md text-center bg-red-100 text-red-800">
                {error}
            </div>
        )}

        <div className="relative">
            {isLoadingIA && (
                <div className="absolute inset-0 bg-gray-500 bg-opacity-30 rounded-lg flex items-center justify-center z-10">
                    <div className="w-12 h-12 border-4 border-white border-dashed rounded-full animate-spin"></div>
                </div>
            )}
            <TimetableGrid turma={selectedTurma} schedule={schedule} />
        </div>

        {isDeleteModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setIsDeleteModalOpen(false)}>
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Confirmar Limpeza</h2>
                        <button onClick={() => setIsDeleteModalOpen(false)} className="p-1 rounded-full hover:bg-[#f6f6f6]"><CloseIcon className="w-5 h-5 text-gray-600"/></button>
                    </div>
                    <p className="text-gray-600">Você tem certeza que deseja excluir a grade salva para a turma <span className="font-semibold">{selectedTurma?.nome}</span>? Esta ação não pode ser desfeita.</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                        <button onClick={handleConfirmDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400">{isSubmitting ? 'Excluindo...' : 'Excluir'}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default GenerateTimetablePage;