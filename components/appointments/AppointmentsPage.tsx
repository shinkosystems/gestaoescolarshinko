import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Usuario, Cargo, Compromisso, SolicitacaoExclusaoCompromisso } from '../../types';
import { ChevronLeftIcon, TrashIcon, CheckIcon, XMarkIcon, CloseIcon, ClockIcon } from '../icons/Icons';
import AppointmentModal from './AppointmentModal';

interface AppointmentsPageProps {
    userProfile: Usuario;
    onNavigateBack: () => void;
}

const ConfirmationModal: React.FC<{ isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, children: React.ReactNode, isSubmitting: boolean }> = ({ isOpen, onClose, onConfirm, title, children, isSubmitting }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-[#f6f6f6]"><CloseIcon className="w-5 h-5 text-gray-600"/></button>
                </div>
                <div>{children}</div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button onClick={onConfirm} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400">{isSubmitting ? 'Enviando...' : 'Confirmar'}</button>
                </div>
            </div>
        </div>
    );
};

const AppointmentsPage: React.FC<AppointmentsPageProps> = ({ userProfile, onNavigateBack }) => {
    const isProfessor = userProfile.cargo === Cargo.PROFESSOR;
    const isManager = [Cargo.DIRETOR, Cargo.VICE_DIRETOR, Cargo.SUPERVISOR].includes(userProfile.cargo);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Professor state
    const [myAppointments, setMyAppointments] = useState<Compromisso[]>([]);
    
    // Manager state
    const [activeTab, setActiveTab] = useState<'professores' | 'solicitacoes'>('professores');
    const [allProfessors, setAllProfessors] = useState<Pick<Usuario, 'id' | 'nome'>[]>([]);
    const [appointmentsByProfessor, setAppointmentsByProfessor] = useState<{[key: string]: Compromisso[]}>({});
    const [requests, setRequests] = useState<SolicitacaoExclusaoCompromisso[]>([]);
    const [expandedProfessor, setExpandedProfessor] = useState<string | null>(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [deletingAppointment, setDeletingAppointment] = useState<Compromisso | null>(null);


    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isProfessor) {
                const { data, error } = await supabase.from('compromissos').select('*').eq('id_professor', userProfile.id).order('horario_inicio');
                if (error) throw error;
                setMyAppointments(data || []);
            }
            if (isManager) {
                const [profs, appointments, reqs] = await Promise.all([
                    supabase.from('usuarios').select('id, nome').eq('cargo', Cargo.PROFESSOR).order('nome'),
                    supabase.from('compromissos').select('*, usuarios(nome)').order('horario_inicio'),
                    supabase.from('solicitacoes_exclusao_compromissos').select('*, compromissos(*, usuarios(nome))').eq('status', 'pendente').order('criado_em')
                ]);
                if (profs.error) throw profs.error;
                if (appointments.error) throw appointments.error;
                if (reqs.error) throw reqs.error;

                setAllProfessors(profs.data || []);
                const groupedAppointments = (appointments.data || []).reduce((acc, curr) => {
                    (acc[curr.id_professor] = acc[curr.id_professor] || []).push(curr);
                    return acc;
                }, {} as {[key: string]: Compromisso[]});
                setAppointmentsByProfessor(groupedAppointments);
                setRequests(reqs.data || []);
            }
        } catch (err: any) {
            setError('Falha ao carregar dados: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [isProfessor, isManager, userProfile.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenDeleteConfirm = (compromisso: Compromisso) => {
        setDeletingAppointment(compromisso);
        setIsConfirmModalOpen(true);
    };

    const handleDeleteRequest = async () => {
        if (!deletingAppointment) return;
        setIsSubmitting(true);
        const { error } = await supabase.from('solicitacoes_exclusao_compromissos').insert({
            id_compromisso: deletingAppointment.id,
            status: 'pendente'
        });
        setIsSubmitting(false);
        if (error) {
            setError('Erro ao solicitar exclusão: ' + error.message);
        } else {
            setIsConfirmModalOpen(false);
            alert('Solicitação de exclusão enviada com sucesso.');
        }
    };

    const handleRequestAction = async (requestId: number, newStatus: 'aprovado' | 'negado') => {
        const originalRequest = requests.find(r => r.id === requestId);
        if (!originalRequest) return;
        
        setIsSubmitting(true);
        const { error: updateError } = await supabase.from('solicitacoes_exclusao_compromissos').update({ status: newStatus }).eq('id', requestId);
        
        if (updateError) {
            setError('Erro ao atualizar solicitação: ' + updateError.message);
            setIsSubmitting(false);
            return;
        }

        if (newStatus === 'aprovado') {
            const { error: deleteError } = await supabase.from('compromissos').delete().eq('id', originalRequest.id_compromisso);
            if (deleteError) {
                 setError('Erro ao excluir compromisso: ' + deleteError.message);
            }
        }
        
        await fetchData();
        setIsSubmitting(false);
    };

    const ProfessorView = () => (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Criar Novo Compromisso</button>
            </div>
            <div className="bg-white shadow-md rounded-lg">
                <ul className="divide-y divide-gray-200">
                    {myAppointments.length > 0 ? myAppointments.map(c => (
                        <li key={c.id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-gray-900">{c.local}</p>
                                <p className="text-sm text-gray-600">{(c.dias_semana || []).join(', ')}</p>
                                <p className="text-sm text-gray-600">{c.horario_inicio.substring(0, 5)} - {c.horario_fim.substring(0, 5)}</p>
                            </div>
                            <button onClick={() => handleOpenDeleteConfirm(c)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-[#f6f6f6]"><TrashIcon className="w-5 h-5" /></button>
                        </li>
                    )) : <p className="p-4 text-center text-gray-500">Nenhum compromisso cadastrado.</p>}
                </ul>
            </div>
        </div>
    );
    
    const ManagerView = () => (
        <div>
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('professores')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'professores' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Professores</button>
                    <button onClick={() => setActiveTab('solicitacoes')} className={`relative whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'solicitacoes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Solicitações de Exclusão
                        {requests.length > 0 && <span className="ml-2 absolute top-2 -right-4 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{requests.length}</span>}
                    </button>
                </nav>
            </div>
            
            {activeTab === 'professores' && (
                <div className="space-y-2">
                    {allProfessors.map(prof => (
                        <div key={prof.id} className="bg-white shadow-sm rounded-lg">
                            <button onClick={() => setExpandedProfessor(expandedProfessor === prof.id ? null : prof.id)} className="w-full text-left p-4 font-semibold text-gray-800">
                                {prof.nome}
                            </button>
                            {expandedProfessor === prof.id && (
                                <div className="p-4 border-t border-gray-200">
                                    {(appointmentsByProfessor[prof.id] || []).length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(appointmentsByProfessor[prof.id] || []).map(c => (
                                                <div key={c.id} className="bg-[#f6f6f6] p-3 rounded-md">
                                                     <p className="font-semibold">{c.local}</p>
                                                     <p className="text-sm text-gray-600">{(c.dias_semana || []).join(', ')}</p>
                                                     <p className="text-sm text-gray-600">{c.horario_inicio.substring(0, 5)} - {c.horario_fim.substring(0, 5)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-gray-500">Nenhum compromisso para este professor.</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {activeTab === 'solicitacoes' && (
                 <div className="space-y-4">
                    {requests.length > 0 ? requests.map(req => req.compromissos && (
                        <div key={req.id} className="bg-white shadow-md rounded-lg p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-900">{req.compromissos.usuarios.nome}</p>
                                <p className="text-sm text-gray-600">Local: {req.compromissos.local}</p>
                                <p className="text-sm text-gray-600">Dias: {(req.compromissos.dias_semana || []).join(', ')}</p>
                                <p className="text-sm text-gray-600">Horário: {req.compromissos.horario_inicio.substring(0, 5)} - {req.compromissos.horario_fim.substring(0, 5)}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleRequestAction(req.id, 'aprovado')} disabled={isSubmitting} className="p-2 text-green-500 hover:text-green-700 rounded-full hover:bg-green-100"><CheckIcon className="w-6 h-6"/></button>
                                <button onClick={() => handleRequestAction(req.id, 'negado')} disabled={isSubmitting} className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100"><XMarkIcon className="w-6 h-6"/></button>
                            </div>
                        </div>
                    )) : <p className="text-center text-gray-500">Nenhuma solicitação pendente.</p>}
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 mb-6">
                <button onClick={onNavigateBack} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Voltar"><ChevronLeftIcon className="h-6 w-6" /></button>
                <span>Compromissos</span>
            </h1>

            {loading && <div className="text-center">Carregando...</div>}
            {error && <div className="text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</div>}

            {!loading && !error && (
                <>
                    {isProfessor && <ProfessorView />}
                    {isManager && <ManagerView />}
                </>
            )}
            
            {isModalOpen && (
                <AppointmentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={fetchData}
                    userId={userProfile.id}
                />
            )}

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleDeleteRequest}
                title="Solicitar Exclusão"
                isSubmitting={isSubmitting}
            >
                <p className="text-gray-600">Você tem certeza que deseja solicitar a exclusão do compromisso em <span className="font-semibold">{deletingAppointment?.local}</span>? Um gestor precisará aprovar.</p>
            </ConfirmationModal>
        </div>
    );
};

export default AppointmentsPage;