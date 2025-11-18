import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { DiasSemana } from '../../types';
import { CloseIcon } from '../icons/Icons';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    userId: string;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSave, userId }) => {
    const [local, setLocal] = useState('');
    const [horarioInicio, setHorarioInicio] = useState('');
    const [horarioFim, setHorarioFim] = useState('');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDayChange = (day: string) => {
        setSelectedDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDays.length === 0 || !local || !horarioInicio || !horarioFim) {
            setError('Todos os campos são obrigatórios.');
            return;
        }
        setSubmitting(true);
        setError(null);

        const { error } = await supabase.from('compromissos').insert({
            id_professor: userId,
            local,
            dias_semana: selectedDays,
            horario_inicio: horarioInicio,
            horario_fim: horarioFim,
        });

        setSubmitting(false);
        if (error) {
            setError('Erro ao salvar compromisso: ' + error.message);
        } else {
            onSave();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Novo Compromisso</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-[#f6f6f6]"><CloseIcon className="w-5 h-5 text-gray-600"/></button>
                </div>

                <div className="p-6 space-y-4">
                    {error && <div className="text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</div>}
                    
                    <div>
                        <label htmlFor="local" className="block text-sm font-medium text-gray-700">Local</label>
                        <input id="local" type="text" value={local} onChange={e => setLocal(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Dias da Semana</label>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {DiasSemana.map(day => (
                                <label key={day} className="flex items-center space-x-2 text-sm text-gray-600">
                                    <input type="checkbox" checked={selectedDays.includes(day)} onChange={() => handleDayChange(day)} className="rounded text-blue-600 focus:ring-blue-500" />
                                    <span>{day}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="horario_inicio" className="block text-sm font-medium text-gray-700">Horário de Início</label>
                            <input id="horario_inicio" type="time" value={horarioInicio} onChange={e => setHorarioInicio(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="horario_fim" className="block text-sm font-medium text-gray-700">Horário de Fim</label>
                            <input id="horario_fim" type="time" value={horarioFim} onChange={e => setHorarioFim(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 p-4 bg-[#f6f6f6] border-t border-gray-200">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400">{submitting ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

export default AppointmentModal;