import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Materia, Usuario, Cargo } from '../../types';
import { CloseIcon, ChevronLeftIcon, PencilIcon, TrashIcon } from '../icons/Icons';

interface SubjectsPageProps {
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

const SubjectsPage: React.FC<SubjectsPageProps> = ({ userProfile, onNavigateBack }) => {
    const [materias, setMaterias] = useState<Materia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newMateriaName, setNewMateriaName] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
    const [editedMateriaName, setEditedMateriaName] = useState('');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingMateria, setDeletingMateria] = useState<Materia | null>(null);

    const isAuthorized = [Cargo.DIRETOR, Cargo.VICE_DIRETOR, Cargo.SUPERVISOR].includes(userProfile.cargo);

    const fetchMaterias = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('materias')
            .select('*')
            .order('nome', { ascending: true });

        if (error) {
            setError('Falha ao carregar matérias: ' + error.message);
        } else {
            setMaterias(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isAuthorized) {
            fetchMaterias();
        } else {
            setLoading(false);
        }
    }, [isAuthorized, fetchMaterias]);

    const handleCreateMateria = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!newMateriaName.trim()) {
            setError('O nome da matéria não pode estar vazio.');
            return;
        }
        setIsSubmitting(true);
        const { error } = await supabase.from('materias').insert({ nome: newMateriaName.trim() });
        setIsSubmitting(false);
        if (error) {
            setError('Erro ao criar matéria: ' + error.message);
        } else {
            setNewMateriaName('');
            setIsCreateModalOpen(false);
            fetchMaterias();
        }
    };

    const handleUpdateMateria = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMateria || !editedMateriaName.trim()) {
            setError('O nome não pode estar vazio.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        const { error } = await supabase.from('materias').update({ nome: editedMateriaName.trim() }).eq('id', editingMateria.id);
        setIsSubmitting(false);
        if (error) {
            setError('Erro ao atualizar matéria: ' + error.message);
        } else {
            setIsEditModalOpen(false);
            setEditingMateria(null);
            fetchMaterias();
        }
    };

    const handleDeleteMateria = async () => {
        if (!deletingMateria) return;
        setIsSubmitting(true);
        setError(null);
        const { error } = await supabase.from('materias').delete().eq('id', deletingMateria.id);
        setIsSubmitting(false);
        if (error) {
            setError('Erro ao excluir matéria: ' + error.message);
        } else {
            setIsDeleteModalOpen(false);
            setDeletingMateria(null);
            fetchMaterias();
        }
    };

    const openCreateModal = () => {
        setError(null);
        setNewMateriaName('');
        setIsCreateModalOpen(true);
    };

    const openEditModal = (materia: Materia) => {
        setEditingMateria(materia);
        setEditedMateriaName(materia.nome);
        setError(null);
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (materia: Materia) => {
        setDeletingMateria(materia);
        setError(null);
        setIsDeleteModalOpen(true);
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
                    <span>Matérias</span>
                </h1>
                <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">Cadastrar Matéria</button>
            </div>
            
            {loading && <p className="text-center text-gray-600">Carregando matérias...</p>}
            {error && <div className="text-red-600 bg-red-100 p-3 rounded-md text-center mb-4">{error}</div>}
            {!loading && materias.length === 0 && (<div className="bg-white shadow-md rounded-lg p-6 text-center"><p className="text-gray-700">Nenhuma matéria cadastrada ainda.</p></div>)}
            
            {!loading && materias.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {materias.map(materia => (
                        <div key={materia.id} className="bg-white shadow-md rounded-lg p-4 flex justify-between items-center transition-transform transform hover:-translate-y-1">
                            <h3 className="font-semibold text-gray-800 truncate flex-1 mr-2">{materia.nome}</h3>
                            <div className="flex items-center space-x-1">
                                <button onClick={() => openEditModal(materia)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-[#f6f6f6]" aria-label={`Editar ${materia.nome}`}><PencilIcon className="w-5 h-5" /></button>
                                <button onClick={() => openDeleteModal(materia)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-[#f6f6f6]" aria-label={`Excluir ${materia.nome}`}><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Nova Matéria</h2><button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Fechar modal"><CloseIcon className="w-5 h-5 text-gray-600"/></button></div>
                <form onSubmit={handleCreateMateria}>
                    <div><label htmlFor="materia-name" className="block text-sm font-medium text-gray-700">Nome da Matéria</label><input id="materia-name" type="text" value={newMateriaName} onChange={(e) => setNewMateriaName(e.target.value)} required className="mt-1 block w-full px-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ex: Matemática" autoFocus/></div>
                    <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200">Cancelar</button><button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200">{isSubmitting ? 'Salvando...' : 'Salvar'}</button></div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Editar Matéria</h2><button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Fechar modal"><CloseIcon className="w-5 h-5 text-gray-600"/></button></div>
                <form onSubmit={handleUpdateMateria}>
                    <div><label htmlFor="edit-materia-name" className="block text-sm font-medium text-gray-700">Nome da Matéria</label><input id="edit-materia-name" type="text" value={editedMateriaName} onChange={(e) => setEditedMateriaName(e.target.value)} required className="mt-1 block w-full px-4 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" autoFocus/></div>
                    <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200">Cancelar</button><button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200">{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</button></div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
                 <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Confirmar Exclusão</h2><button onClick={() => setIsDeleteModalOpen(false)} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Fechar modal"><CloseIcon className="w-5 h-5 text-gray-600"/></button></div>
                 <p className="text-gray-600">Você tem certeza que deseja excluir a matéria <span className="font-semibold">{deletingMateria?.nome}</span>? Esta ação não pode ser desfeita.</p>
                 <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200">Cancelar</button><button onClick={handleDeleteMateria} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors duration-200">{isSubmitting ? 'Excluindo...' : 'Excluir'}</button></div>
            </Modal>
        </div>
    );
};

export default SubjectsPage;