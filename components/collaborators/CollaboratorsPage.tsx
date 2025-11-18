import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { Usuario, Cargo, StatusUsuario } from '../../types';
import { ChevronLeftIcon, TrashIcon, CheckIcon, XMarkIcon, UserCircleIcon, CloseIcon } from '../icons/Icons';
import ProfessorDetailsModal from './ProfessorDetailsModal';

interface CollaboratorsPageProps {
    userProfile: Usuario;
    onNavigateBack: () => void;
}

const Modal: React.FC<{ isOpen: boolean, onClose: () => void, children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

const CollaboratorsPage: React.FC<CollaboratorsPageProps> = ({ userProfile, onNavigateBack }) => {
    const isAuthorized = [Cargo.DIRETOR, Cargo.VICE_DIRETOR].includes(userProfile.cargo);
    const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
    const [approvedUsers, setApprovedUsers] = useState<Usuario[]>([]);
    const [pendingUsers, setPendingUsers] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState<Usuario | null>(null);
    
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedProfessor, setSelectedProfessor] = useState<Usuario | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeRoleFilters, setActiveRoleFilters] = useState<Cargo[]>([]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.from('usuarios').select('*');
            if (error) throw error;
            setApprovedUsers(data.filter(u => u.status === StatusUsuario.APROVADO).sort((a, b) => a.nome.localeCompare(b.nome)));
            setPendingUsers(data.filter(u => u.status === StatusUsuario.PENDENTE).sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()));
        } catch (error: any) {
            setError('Falha ao carregar colaboradores: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthorized) {
            fetchUsers();
        } else {
            setLoading(false);
        }
    }, [isAuthorized, fetchUsers]);
    
    const filteredApprovedUsers = useMemo(() => {
        return approvedUsers.filter(user => {
            const matchesSearchTerm = user.nome.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRoleFilter = activeRoleFilters.length === 0 || activeRoleFilters.includes(user.cargo);
            return matchesSearchTerm && matchesRoleFilter;
        });
    }, [approvedUsers, searchTerm, activeRoleFilters]);

    const toggleRoleFilter = (role: Cargo) => {
        setActiveRoleFilters(prevFilters =>
            prevFilters.includes(role)
                ? prevFilters.filter(r => r !== role)
                : [...prevFilters, role]
        );
    };
    
    const openProfessorDetails = (user: Usuario) => {
        if (user.cargo === Cargo.PROFESSOR) {
            setSelectedProfessor(user);
            setIsDetailsModalOpen(true);
        }
    };

    const handleStatusUpdate = async (userId: string, newStatus: StatusUsuario) => {
        setIsSubmitting(userId);
        const { error } = await supabase.from('usuarios').update({ status: newStatus }).eq('id', userId);
        if (error) {
            setError(error.message);
        } else {
            await fetchUsers();
        }
        setIsSubmitting(null);
    };
    
    const openDeleteModal = (user: Usuario) => {
        setDeletingUser(user);
        setIsDeleteModalOpen(true);
    };
    
    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        setIsSubmitting(deletingUser.id);
        const { error } = await supabase.from('usuarios').delete().eq('id', deletingUser.id);
        
        if (error) {
            setError('Erro ao excluir usuário: ' + error.message);
        } else {
            setIsDeleteModalOpen(false);
            setDeletingUser(null);
            await fetchUsers();
        }
        setIsSubmitting(null);
    };

    if (!isAuthorized) {
        return (
            <div className="max-w-7xl mx-auto"><div className="bg-white shadow-md rounded-lg p-6 text-center"><h2 className="text-xl font-bold text-red-600">Acesso Negado</h2><p className="text-gray-700 mt-2">Você não tem permissão para visualizar esta página.</p></div></div>
        );
    }

    const UserList = ({ users, isPendingList }: { users: Usuario[], isPendingList?: boolean }) => (
        <div className="space-y-3">
            {users.length > 0 ? users.map(user => {
                const isProfessor = user.cargo === Cargo.PROFESSOR;
                const UserCardContent = () => (
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                            <img src={user.avatar_url || undefined} alt={user.nome} className="h-10 w-10 rounded-full object-cover bg-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            <UserCircleIcon className={`h-10 w-10 text-gray-400 flex-shrink-0 ${user.avatar_url ? 'hidden' : ''}`}/>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{user.nome}</p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                <p className="text-xs text-gray-500">{user.cargo}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                            {isSubmitting === user.id ? (
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : isPendingList ? (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(user.id, StatusUsuario.APROVADO); }} className="p-2 text-green-500 hover:text-green-700 rounded-full hover:bg-green-100" aria-label={`Aprovar ${user.nome}`}><CheckIcon className="w-5 h-5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(user.id, StatusUsuario.NEGADO); }} className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100" aria-label={`Negar ${user.nome}`}><XMarkIcon className="w-5 h-5" /></button>
                                </>
                            ) : (
                                !isProfessor && <button onClick={(e) => { e.stopPropagation(); openDeleteModal(user); }} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-[#f6f6f6]" aria-label={`Excluir ${user.nome}`}><TrashIcon className="w-5 h-5" /></button>
                            )}
                        </div>
                    </div>
                );

                return (
                    <button 
                        key={user.id} 
                        onClick={() => openProfessorDetails(user)}
                        disabled={!isProfessor}
                        className={`w-full text-left bg-white shadow-md rounded-lg p-3 flex items-center justify-between transition-all duration-200 ${isProfessor ? 'cursor-pointer hover:shadow-lg hover:ring-1 hover:ring-blue-500' : 'cursor-default'}`}
                    >
                       <UserCardContent />
                    </button>
                )
            }) : (
                 <div className="bg-white shadow-md rounded-lg p-6 text-center">
                     <p className="text-gray-700">
                         {isPendingList ? 'Nenhum cadastro pendente.' : 'Nenhum colaborador encontrado com os filtros aplicados.'}
                     </p>
                 </div>
            )}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 mb-6">
                <button onClick={onNavigateBack} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Voltar"><ChevronLeftIcon className="h-6 w-6" /></button>
                <span>Colaboradores</span>
            </h1>
            
            {error && <div className="text-red-600 bg-red-100 p-3 rounded-md text-center mb-4">{error}</div>}

            <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
                <div className="space-y-4">
                     <div>
                         <label htmlFor="search-collaborator" className="block text-sm font-medium text-gray-700 mb-1">
                             Buscar por Nome
                         </label>
                         <input
                             id="search-collaborator"
                             type="text"
                             placeholder="Digite o nome do colaborador..."
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="block w-full px-3 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                         />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700">
                             Filtrar por Cargo
                         </label>
                         <div className="mt-2 flex flex-wrap gap-2">
                             {(Object.values(Cargo) as Cargo[]).map(role => (
                                 <button
                                     key={role}
                                     onClick={() => toggleRoleFilter(role)}
                                     className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                                         activeRoleFilters.includes(role)
                                             ? 'bg-blue-600 text-white shadow-sm'
                                             : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                     }`}
                                 >
                                     {role}
                                 </button>
                             ))}
                         </div>
                     </div>
                </div>
            </div>

            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('approved')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'approved' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Aprovados</button>
                    <button onClick={() => setActiveTab('pending')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm relative ${activeTab === 'pending' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Pendentes
                        {pendingUsers.length > 0 && <span className="ml-2 absolute top-2 -right-4 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{pendingUsers.length}</span>}
                    </button>
                </nav>
            </div>
            
            {loading ? (<p className="text-center text-gray-600">Carregando...</p>) : (
                <div>
                    {activeTab === 'approved' && <UserList users={filteredApprovedUsers} />}
                    {activeTab === 'pending' && <UserList users={pendingUsers} isPendingList />}
                </div>
            )}

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
                 <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Confirmar Exclusão</h2><button onClick={() => setIsDeleteModalOpen(false)} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Fechar modal"><CloseIcon className="w-5 h-5 text-gray-600"/></button></div>
                 <p className="text-gray-600">Você tem certeza que deseja excluir o colaborador <span className="font-semibold">{deletingUser?.nome}</span>? Esta ação removerá seu perfil do sistema.</p>
                 <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button><button onClick={handleDeleteUser} disabled={!!isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400">{isSubmitting === deletingUser?.id ? 'Excluindo...' : 'Excluir'}</button></div>
            </Modal>
            
            {isDetailsModalOpen && selectedProfessor && (
                <ProfessorDetailsModal 
                    user={selectedProfessor} 
                    onClose={() => setIsDetailsModalOpen(false)} 
                />
            )}
        </div>
    );
};

export default CollaboratorsPage;