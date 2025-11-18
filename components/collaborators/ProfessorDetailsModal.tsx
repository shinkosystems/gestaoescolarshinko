import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { Usuario, Materia } from '../../types';
import { CloseIcon, UserCircleIcon, XMarkIcon, BriefcaseIcon, PhoneIcon } from '../icons/Icons';

interface ProfessorDetailsModalProps {
    user: Usuario;
    onClose: () => void;
}

const ProfessorDetailsModal: React.FC<ProfessorDetailsModalProps> = ({ user, onClose }) => {
    const [professorMaterias, setProfessorMaterias] = useState<Materia[]>([]);
    const [allMaterias, setAllMaterias] = useState<Materia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedNewMateriaId, setSelectedNewMateriaId] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: profMateriaLinks, error: linkError } = await supabase
                .from('professores_materias')
                .select('id_materia')
                .eq('id_professor', user.id);
            if (linkError) throw linkError;
            
            const materiaIds = profMateriaLinks.map(link => link.id_materia);

            const [profSubjectsRes, allSubjectsRes] = await Promise.all([
                materiaIds.length > 0 ? supabase.from('materias').select('*').in('id', materiaIds) : Promise.resolve({ data: [], error: null }),
                supabase.from('materias').select('*').order('nome')
            ]);
            
            if (profSubjectsRes.error) throw profSubjectsRes.error;
            if (allSubjectsRes.error) throw allSubjectsRes.error;

            setProfessorMaterias(profSubjectsRes.data || []);
            setAllMaterias(allSubjectsRes.data || []);

        } catch (err: any) {
            setError('Falha ao carregar dados do professor: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const availableMaterias = useMemo(() => {
        return allMaterias.filter(materia => 
            !professorMaterias.some(profMateria => profMateria.id === materia.id)
        );
    }, [allMaterias, professorMaterias]);
    
    const handleAssignMateria = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNewMateriaId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            const { error: insertError } = await supabase.from('professores_materias').insert({
                id_professor: user.id,
                id_materia: selectedNewMateriaId
            });

            if (insertError) throw insertError;
            
            setIsAssigning(false);
            setSelectedNewMateriaId('');
            await fetchData(); 

        } catch (err: any) {
            setError('Erro ao atribuir matéria: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTelefone = (value: string | null | undefined) => {
        if (!value) return 'Não informado';
        const cleaned = value.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{1})(\d{4})(\d{4})$/);
        if (match) {
          return `(${match[1]}) ${match[2]} ${match[3]}-${match[4]}`;
        }
        return value;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Detalhes do Professor</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Fechar modal"><CloseIcon className="w-5 h-5 text-gray-600"/></button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {error && <div className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>}
                    
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="h-24 w-24 rounded-full object-cover shadow-md flex-shrink-0" />
                        ) : (
                            <UserCircleIcon className="h-24 w-24 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="w-full text-center sm:text-left">
                            <p className="text-2xl font-bold text-gray-900">{user.nome}</p>
                            <p className="text-gray-600">{user.email}</p>
                            <div className="mt-2 flex items-center justify-center sm:justify-start gap-4 text-sm text-gray-700">
                                <span className="flex items-center gap-1.5"><BriefcaseIcon className="w-4 h-4 text-gray-500"/>{user.cargo}</span>
                                <span className="flex items-center gap-1.5"><PhoneIcon className="w-4 h-4 text-gray-500"/>{formatTelefone(user.telefone)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-2">Matérias que Leciona</h3>
                        {loading ? <p className="text-gray-500">Carregando...</p> : (
                            professorMaterias.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {professorMaterias.map(materia => (
                                        <span key={materia.id} className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                                            {materia.nome}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">Nenhuma matéria atribuída.</p>
                            )
                        )}
                    </div>

                    {!isAssigning && availableMaterias.length > 0 && (
                         <div className="pt-4">
                            <button onClick={() => setIsAssigning(true)} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                                Atribuir Matéria
                            </button>
                        </div>
                    )}
                    
                    {isAssigning && (
                        <form onSubmit={handleAssignMateria} className="p-4 bg-[#f6f6f6] rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-800">Nova Matéria</h4>
                             <select 
                                value={selectedNewMateriaId} 
                                onChange={(e) => setSelectedNewMateriaId(Number(e.target.value))}
                                className="w-full px-4 py-2 bg-white text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="" disabled>Selecione uma matéria</option>
                                {availableMaterias.map(materia => (
                                    <option key={materia.id} value={materia.id}>{materia.nome}</option>
                                ))}
                            </select>
                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={() => { setIsAssigning(false); setError(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors duration-200">
                                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfessorDetailsModal;