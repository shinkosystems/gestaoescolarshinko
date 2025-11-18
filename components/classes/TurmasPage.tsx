import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Turma, Usuario, Cargo, TurmaMateriaProfessor, TipoTurma } from '../../types';
import { ChevronLeftIcon, PencilIcon, TrashIcon, CloseIcon, ClockIcon, BookOpenIcon } from '../icons/Icons';
import ClassModal from './ClassModal';

interface TurmasPageProps {
    userProfile: Usuario;
    onNavigateBack: () => void;
}

const ConfirmationModal: React.FC<{ isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, children: React.ReactNode, isSubmitting: boolean }> = ({ isOpen, onClose, onConfirm, title, children, isSubmitting }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Fechar modal"><CloseIcon className="w-5 h-5 text-gray-600"/></button>
                </div>
                <div>{children}</div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200">Cancelar</button>
                    <button onClick={onConfirm} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors duration-200">{isSubmitting ? 'Excluindo...' : 'Excluir'}</button>
                </div>
            </div>
        </div>
    );
};

const TurmasPage: React.FC<TurmasPageProps> = ({ userProfile, onNavigateBack }) => {
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTurma, setEditingTurma] = useState<Turma | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingTurma, setDeletingTurma] = useState<Turma | null>(null);

    const isAuthorized = [Cargo.DIRETOR, Cargo.VICE_DIRETOR, Cargo.SUPERVISOR].includes(userProfile.cargo);

    const fetchTurmas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select(`
                    *,
                    turmas_materias (
                        id_materia,
                        quantidade_aulas
                    ),
                    turmas_materias_professores (
                        id_materia,
                        id_professor
                    )
                `)
                .order('nome', { ascending: true });

            if (error) throw error;
            
            const turmasComRelacoes = (data || []).map(turma => {
                const materias_professores: TurmaMateriaProfessor[] = (turma.turmas_materias || []).map((tm: any) => {
                    const profLink = (turma.turmas_materias_professores || []).find((tmp: any) => tmp.id_materia === tm.id_materia);
                    return {
                        id_materia: tm.id_materia,
                        quantidade_aulas: tm.quantidade_aulas,
                        id_professor: profLink ? profLink.id_professor : '',
                    };
                });

                const { turmas_materias, turmas_materias_professores, ...restOfTurma } = turma;

                return {
                    ...restOfTurma,
                    tipo: restOfTurma.tipo?.toLowerCase() === 'integral' ? TipoTurma.INTEGRAL : TipoTurma.PARCIAL,
                    materias_professores,
                };
            });

            setTurmas(turmasComRelacoes as Turma[]);
        } catch (err: any) {
            setError('Falha ao carregar turmas: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthorized) {
            fetchTurmas();
        } else {
            setLoading(false);
        }
    }, [isAuthorized, fetchTurmas]);

    const openCreateModal = () => {
        setEditingTurma(null);
        setIsModalOpen(true);
    };

    const openEditModal = (turma: Turma) => {
        setEditingTurma(turma);
        setIsModalOpen(true);
    };

    const openDeleteModal = (turma: Turma) => {
        setDeletingTurma(turma);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteTurma = async () => {
        if (!deletingTurma) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const { error } = await supabase.from('turmas').delete().eq('id', deletingTurma.id);
            if (error) throw error;
            setIsDeleteModalOpen(false);
            setDeletingTurma(null);
            await fetchTurmas();
        } catch(err: any) {
            setError('Erro ao excluir turma: ' + err.message);
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
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                    <button onClick={onNavigateBack} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Voltar">
                        <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                    <span>Turmas</span>
                </h1>
                <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                    Criar Nova Turma
                </button>
            </div>
            
            {loading && <div className="text-center text-gray-600">Carregando turmas...</div>}
            {error && <div className="text-red-600 bg-red-100 p-3 rounded-md text-center mb-4">{error}</div>}
            
            {!loading && turmas.length === 0 && (
                <div className="bg-white shadow-md rounded-lg p-6 text-center">
                    <p className="text-gray-700">Nenhuma turma cadastrada ainda.</p>
                </div>
            )}
            
            {!loading && turmas.length > 0 && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {turmas.map(turma => {
                        const totalAulas = turma.materias_professores.reduce((sum, mp) => sum + (mp.quantidade_aulas || 0), 0);
                        const tipoTurmaClass = turma.tipo === TipoTurma.INTEGRAL
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800';

                        return (
                            <div key={turma.id} className="bg-white shadow-lg rounded-xl overflow-hidden flex flex-col transition-transform transform hover:-translate-y-1">
                                <div className="p-5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 truncate">{turma.nome}</h3>
                                            <span className={`inline-block mt-2 px-2.5 py-0.5 text-xs font-semibold rounded-full ${tipoTurmaClass}`}>{turma.tipo}</span>
                                        </div>
                                        <div className="flex items-center space-x-1 flex-shrink-0">
                                            <button onClick={() => openEditModal(turma)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-[#f6f6f6]" aria-label={`Editar ${turma.nome}`}><PencilIcon className="w-5 h-5" /></button>
                                            <button onClick={() => openDeleteModal(turma)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-[#f6f6f6]" aria-label={`Excluir ${turma.nome}`}><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto bg-[#f6f6f6] p-5 border-t border-gray-200 space-y-3">
                                    <div className="flex items-center space-x-3 text-gray-600">
                                        <ClockIcon className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm font-medium">{turma.horario_inicio} - {turma.horario_fim}</span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-gray-600">
                                        <BookOpenIcon className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm font-medium">{totalAulas} Aulas Semanais</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {isModalOpen && (
                <ClassModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={fetchTurmas}
                    turmaToEdit={editingTurma}
                />
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteTurma}
                title="Confirmar Exclusão"
                isSubmitting={isSubmitting}
            >
                 <p className="text-gray-600">Você tem certeza que deseja excluir a turma <span className="font-semibold">{deletingTurma?.nome}</span>? Esta ação não pode ser desfeita.</p>
            </ConfirmationModal>
        </div>
    );
};

export default TurmasPage;