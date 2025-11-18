import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { Turma, TipoTurma, TurmaMateriaProfessor, Materia, Usuario, Cargo } from '../../types';
import { CloseIcon } from '../icons/Icons';

interface ClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    turmaToEdit?: Turma | null;
}

interface FormData {
    allMaterias: Materia[];
    teachersByMateria: { [materiaId: number]: Pick<Usuario, 'id' | 'nome'>[] };
}

const emptyTurma: Omit<Turma, 'id' | 'criado_em'> = {
    nome: '',
    tipo: TipoTurma.PARCIAL,
    sexto_horario: false,
    horario_gerado: false,
    horario_inicio: '',
    horario_fim: '',
    horario_inicio_primeiro_intervalo: '',
    horario_fim_primeiro_intervalo: '',
    horario_inicio_almoco: null,
    horario_fim_almoco: null,
    horario_inicio_segundo_intervalo: null,
    horario_fim_segundo_intervalo: null,
    materias_professores: [],
};

const formacaoGeralNomes = ['Matemática', 'Português', 'Geografia', 'História', 'Ciências', 'Física', 'Química', 'Biologia', 'Filosofia', 'Sociologia', 'Ensino Religioso', 'Artes', 'Educação Física', 'Inglês'];
const itinerarioFormativoNomes = ['Projeto de Vida', 'Estudos Orientados', 'Práticas Experimentais', 'Vivências em Linguagens', 'Linguagens Artísticas', 'Cultura Corporal do Movimento', 'Eletiva', 'Tecnologia e Inovação', 'Emergência Climática Global', 'Educomunicação e Ambientalismo', 'Trabalho e Desenvolvimento Econômico', 'Finanças, Economia e Trabalho'];

const ClassModal: React.FC<ClassModalProps> = ({ isOpen, onClose, onSave, turmaToEdit }) => {
    const [turmaData, setTurmaData] = useState<Omit<Turma, 'id' | 'criado_em'> | Turma>(emptyTurma);
    const [formData, setFormData] = useState<FormData>({ allMaterias: [], teachersByMateria: {} });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'formacao' | 'itinerario'>('formacao');

    const fetchFormData = useCallback(async () => {
        setLoading(true);
        try {
            const [materiasRes, profsRes, linksRes] = await Promise.all([
                supabase.from('materias').select('*').order('nome'),
                supabase.from('usuarios').select('id, nome').eq('cargo', Cargo.PROFESSOR),
                supabase.from('professores_materias').select('id_professor, id_materia')
            ]);

            if (materiasRes.error) throw materiasRes.error;
            if (profsRes.error) throw profsRes.error;
            if (linksRes.error) throw linksRes.error;

            const teachersByMateria: { [materiaId: number]: Pick<Usuario, 'id' | 'nome'>[] } = {};
            for (const materia of materiasRes.data) {
                const teacherIds = linksRes.data
                    .filter((link: any) => link.id_materia === materia.id)
                    .map((link: any) => link.id_professor);
                
                teachersByMateria[materia.id] = (profsRes.data || []).filter((prof: any) => teacherIds.includes(prof.id));
            }
            
            setFormData({ allMaterias: materiasRes.data, teachersByMateria });
        } catch (err: any) {
            setError('Falha ao carregar dados do formulário: ' + (err.message || String(err)));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if(isOpen) {
            fetchFormData();
            if (turmaToEdit) {
                setTurmaData(turmaToEdit);
            } else {
                setTurmaData(emptyTurma);
            }
        }
    }, [isOpen, turmaToEdit, fetchFormData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTurmaData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleTipoChange = (newTipo: TipoTurma) => {
        setTurmaData(prev => {
            const updated = { ...prev, tipo: newTipo };
            if (newTipo === TipoTurma.PARCIAL) {
                updated.horario_inicio_almoco = null;
                updated.horario_fim_almoco = null;
                updated.horario_inicio_segundo_intervalo = null;
                updated.horario_fim_segundo_intervalo = null;
            } else { // Integral
                updated.sexto_horario = false;
            }
            return updated;
        });
    };
    
    const handleMateriaProfChange = (materiaId: number, professorId: string, aulas: number) => {
        const parsedAulas = !aulas || isNaN(aulas) ? 0 : aulas;

        setTurmaData(prev => {
            const existing = prev.materias_professores.find(mp => mp.id_materia === materiaId);
            
            const newEntryState: TurmaMateriaProfessor = {
                id_materia: materiaId,
                id_professor: professorId,
                quantidade_aulas: parsedAulas
            };
    
            const isValid = !!newEntryState.id_professor || newEntryState.quantidade_aulas > 0;
            
            let newMateriasProfessores: TurmaMateriaProfessor[];
    
            if (isValid) {
                if (existing) {
                    newMateriasProfessores = prev.materias_professores.map(mp =>
                        mp.id_materia === materiaId ? newEntryState : mp
                    );
                } else {
                    newMateriasProfessores = [...prev.materias_professores, newEntryState];
                }
            } else {
                newMateriasProfessores = prev.materias_professores.filter(mp => mp.id_materia !== materiaId);
            }
    
            return { ...prev, materias_professores: newMateriasProfessores };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const cleanedData = {
                ...turmaData,
                horario_inicio_almoco: turmaData.horario_inicio_almoco || null,
                horario_fim_almoco: turmaData.horario_fim_almoco || null,
                horario_inicio_segundo_intervalo: turmaData.horario_inicio_segundo_intervalo || null,
                horario_fim_segundo_intervalo: turmaData.horario_fim_segundo_intervalo || null,
            };

            if (!cleanedData.nome || !cleanedData.horario_inicio || !cleanedData.horario_fim || !cleanedData.horario_inicio_primeiro_intervalo || !cleanedData.horario_fim_primeiro_intervalo) {
                throw new Error('Preencha todos os campos obrigatórios (nome e horários de aulas/intervalo).');
            }
            if (cleanedData.tipo === TipoTurma.INTEGRAL) {
                if (!cleanedData.horario_inicio_almoco || !cleanedData.horario_fim_almoco || !cleanedData.horario_inicio_segundo_intervalo || !cleanedData.horario_fim_segundo_intervalo) {
                    throw new Error('Para turmas integrais, é necessário informar todos os horários de almoço e 2º intervalo.');
                }
            }

            const { materias_professores, ...turmaCoreInfo } = cleanedData;
            
            const turmaPayload = {
                nome: turmaCoreInfo.nome,
                tipo: turmaCoreInfo.tipo.toLowerCase(),
                sexto_horario: turmaCoreInfo.sexto_horario,
                horario_inicio: turmaCoreInfo.horario_inicio,
                horario_fim: turmaCoreInfo.horario_fim,
                horario_inicio_primeiro_intervalo: turmaCoreInfo.horario_inicio_primeiro_intervalo,
                horario_fim_primeiro_intervalo: turmaCoreInfo.horario_fim_primeiro_intervalo,
                horario_inicio_almoco: turmaCoreInfo.horario_inicio_almoco,
                horario_fim_almoco: turmaCoreInfo.horario_fim_almoco,
                horario_inicio_segundo_intervalo: turmaCoreInfo.horario_inicio_segundo_intervalo,
                horario_fim_segundo_intervalo: turmaCoreInfo.horario_fim_segundo_intervalo,
            };

            let turma_id: number;

            if (turmaToEdit) {
                turma_id = turmaToEdit.id;
                const { error: updateError } = await supabase.from('turmas').update(turmaPayload).eq('id', turma_id);
                if (updateError) throw updateError;
                
                await supabase.from('turmas_materias_professores').delete().eq('id_turma', turma_id);
                await supabase.from('turmas_materias').delete().eq('id_turma', turma_id);

            } else {
                const { data, error: insertError } = await supabase.from('turmas').insert(turmaPayload).select('id').single();
                if (insertError) throw insertError;
                if (!data) throw new Error("Não foi possível criar a turma.");
                turma_id = data.id;
            }

            const validRelations = materias_professores.filter(
                mp => mp.quantidade_aulas && Number(mp.quantidade_aulas) > 0 && mp.id_professor
            );

            if (validRelations.length > 0) {
                const materiasToInsert = validRelations.map(mp => ({
                    id_turma: turma_id,
                    id_materia: mp.id_materia,
                    quantidade_aulas: mp.quantidade_aulas
                }));
                const { error: insertMateriasError } = await supabase.from('turmas_materias').insert(materiasToInsert);
                if (insertMateriasError) throw insertMateriasError;

                const profsToInsert = validRelations.map(mp => ({
                    id_turma: turma_id,
                    id_materia: mp.id_materia,
                    id_professor: mp.id_professor,
                }));
                const { error: insertProfsError } = await supabase.from('turmas_materias_professores').insert(profsToInsert);
                if (insertProfsError) throw insertProfsError;
            }

            onSave();
            onClose();

        } catch (err: any) {
            const errorMessage = err.message || err.details || 'Ocorreu um erro desconhecido.';
            setError(`Erro ao salvar turma: ${errorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };
    
    const formacaoGeralMaterias = useMemo(() => 
        formData.allMaterias.filter(m => formacaoGeralNomes.includes(m.nome)), 
        [formData.allMaterias]
    );

    const itinerarioFormativoMaterias = useMemo(() => 
        formData.allMaterias.filter(m => itinerarioFormativoNomes.includes(m.nome)),
        [formData.allMaterias]
    );

    const inputClassName = "w-full px-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

    const renderMateriaList = (materias: Materia[]) => (
        <div className="space-y-4">
            {materias.length > 0 ? materias.map(materia => {
                const selection = turmaData.materias_professores.find(mp => mp.id_materia === materia.id);
                const isSelected = !!selection && selection.quantidade_aulas > 0 && !!selection.id_professor;

                return (
                    <div key={materia.id} className={`p-3 rounded-lg border ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                             <div className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={isSelected} 
                                    readOnly 
                                />
                                <label className="ml-3 font-medium text-gray-800">{materia.nome}</label>
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <select
                                value={selection?.id_professor || ''}
                                onChange={(e) => handleMateriaProfChange(materia.id, e.target.value, selection?.quantidade_aulas || 0)}
                                className="w-full text-sm px-3 py-1.5 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">{formData.teachersByMateria[materia.id]?.length > 0 ? 'Selecione um professor' : 'Nenhum professor'}</option>
                                {formData.teachersByMateria[materia.id]?.map(prof => (
                                    <option key={prof.id} value={prof.id}>{prof.nome}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min="1"
                                placeholder="Aulas/semana"
                                value={selection?.quantidade_aulas || ''}
                                onChange={(e) => handleMateriaProfChange(materia.id, selection?.id_professor || '', parseInt(e.target.value, 10))}
                                className="w-full text-sm px-3 py-1.5 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                );
            }) : <p className="text-sm text-gray-500 text-center py-4">Nenhuma matéria encontrada para esta categoria.</p>}
        </div>
    );

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">{turmaToEdit ? 'Editar Turma' : 'Criar Nova Turma'}</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Fechar modal"><CloseIcon className="w-5 h-5 text-gray-600"/></button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                    {error && <div className="text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</div>}
                    
                    {loading ? <div className="text-center">Carregando dados...</div> : (
                        <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome da Turma</label>
                                <input type="text" name="nome" value={turmaData.nome} onChange={handleInputChange} required className={`mt-1 block ${inputClassName}`} placeholder="Ex: 1º Ano A" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de Turma</label>
                                <div className="mt-2 flex rounded-md shadow-sm">
                                    <button type="button" onClick={() => handleTipoChange(TipoTurma.PARCIAL)} className={`toggle-btn-left ${turmaData.tipo === TipoTurma.PARCIAL ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}>Parcial</button>
                                    <button type="button" onClick={() => handleTipoChange(TipoTurma.INTEGRAL)} className={`toggle-btn-right ${turmaData.tipo === TipoTurma.INTEGRAL ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}>Integral</button>
                                </div>
                                <style>{`.toggle-btn-left { border-top-left-radius: 0.375rem; border-bottom-left-radius: 0.375rem; } .toggle-btn-right { border-top-right-radius: 0.375rem; border-bottom-right-radius: 0.375rem; } .toggle-btn-active { background-color: #2563EB; color: white; } .toggle-btn-inactive { background-color: #E5E7EB; color: #374151; } .toggle-btn-left, .toggle-btn-right { flex: 1; padding: 0.5rem; font-size: 0.875rem; border: 1px solid #D1D5DB; }`}</style>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Horário Início</label>
                                <input type="time" name="horario_inicio" value={turmaData.horario_inicio} onChange={handleInputChange} required className={`mt-1 block ${inputClassName}`} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Horário Fim</label>
                                <input type="time" name="horario_fim" value={turmaData.horario_fim} onChange={handleInputChange} required className={`mt-1 block ${inputClassName}`} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Início 1º Intervalo</label>
                                <input type="time" name="horario_inicio_primeiro_intervalo" value={turmaData.horario_inicio_primeiro_intervalo} onChange={handleInputChange} required className={`mt-1 block ${inputClassName}`} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fim 1º Intervalo</label>
                                <input type="time" name="horario_fim_primeiro_intervalo" value={turmaData.horario_fim_primeiro_intervalo} onChange={handleInputChange} required className={`mt-1 block ${inputClassName}`} />
                            </div>
                        </div>

                        {turmaData.tipo === TipoTurma.INTEGRAL && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Início Almoço</label>
                                        <input type="time" name="horario_inicio_almoco" value={turmaData.horario_inicio_almoco || ''} onChange={handleInputChange} required className={`mt-1 block ${inputClassName}`} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Fim Almoço</label>
                                        <input type="time" name="horario_fim_almoco" value={turmaData.horario_fim_almoco || ''} onChange={handleInputChange} required className={`mt-1 block ${inputClassName}`} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Início 2º Intervalo</label>
                                        <input type="time" name="horario_inicio_segundo_intervalo" value={turmaData.horario_inicio_segundo_intervalo || ''} onChange={handleInputChange} required className={`mt-1 block ${inputClassName}`} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Fim 2º Intervalo</label>
                                        <input type="time" name="horario_fim_segundo_intervalo" value={turmaData.horario_fim_segundo_intervalo || ''} onChange={handleInputChange} required className={`mt-1 block ${inputClassName}`} />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('formacao')}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'formacao' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                >
                                    Formação Geral
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('itinerario')}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'itinerario' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                >
                                    Itinerário Formativo
                                </button>
                            </nav>
                        </div>

                        <div>
                            {activeTab === 'formacao' ? renderMateriaList(formacaoGeralMaterias) : renderMateriaList(itinerarioFormativoMaterias)}
                        </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end space-x-3 p-4 bg-[#f6f6f6] border-t border-gray-200 mt-auto">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200">Cancelar</button>
                    <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200">{submitting ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

export default ClassModal;