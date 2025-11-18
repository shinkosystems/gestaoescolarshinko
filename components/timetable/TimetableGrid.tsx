import React from 'react';
import { HorarioGerado, Turma, TipoTurma } from '../../types';

const diasDaSemana = [
    { short: 'Segunda', long: 'Segunda-feira' },
    { short: 'Terca', long: 'Terça-feira' },
    { short: 'Quarta', long: 'Quarta-feira' },
    { short: 'Quinta', long: 'Quinta-feira' },
    { short: 'Sexta', long: 'Sexta-feira' },
];

const normalizeDay = (day: string) => {
    const found = diasDaSemana.find(d => d.long.toLowerCase() === day.toLowerCase() || d.short.toLowerCase() === day.toLowerCase());
    return found ? found.short : day;
};

interface TimetableGridProps {
  turma: Turma | null;
  schedule: HorarioGerado[];
}

interface AulaCardProps {
    aula: HorarioGerado;
}

const AulaCard: React.FC<AulaCardProps> = ({ aula }) => (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 w-full">
        <p className="font-bold text-sm text-blue-600 truncate">{aula.materias?.nome || 'Matéria não encontrada'}</p>
        <p className="text-xs text-gray-700 mt-1 truncate">{aula.usuarios?.nome || 'Professor não encontrado'}</p>
        <p className="text-xs text-gray-500 mt-2 font-mono">{aula.horario_inicio} - {aula.horario_fim}</p>
    </div>
);

interface BreakDividerProps {
    name: string;
}

const BreakDivider: React.FC<BreakDividerProps> = ({ name }) => (
    <div className="flex items-center py-2" aria-hidden="true">
        <div className="flex-grow border-t border-dashed border-gray-300"></div>
        <span className="flex-shrink mx-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{name}</span>
        <div className="flex-grow border-t border-dashed border-gray-300"></div>
    </div>
);


const TimetableGrid: React.FC<TimetableGridProps> = ({ turma, schedule }) => {
    
    if (!turma) {
        return (
            <div className="bg-white shadow-md rounded-lg p-8 text-center">
                <p className="text-gray-500">Selecione uma turma para visualizar ou gerar a grade horária.</p>
            </div>
        );
    }

    const generateFullDaySchedule = (turma: Turma, aulasDoDia: HorarioGerado[]) => {
        const scheduleItems: Array<{ type: 'aula' | 'break'; startTime: string; data: any }> = [];

        aulasDoDia.forEach(aula => {
            scheduleItems.push({
                type: 'aula',
                startTime: aula.horario_inicio,
                data: aula
            });
        });

        if (turma.horario_inicio_primeiro_intervalo && turma.horario_fim_primeiro_intervalo) {
            scheduleItems.push({
                type: 'break',
                startTime: turma.horario_inicio_primeiro_intervalo,
                data: { name: 'Intervalo' }
            });
        }
        if (turma.tipo === TipoTurma.INTEGRAL && turma.horario_inicio_almoco && turma.horario_fim_almoco) {
            scheduleItems.push({
                type: 'break',
                startTime: turma.horario_inicio_almoco,
                data: { name: 'Almoço' }
            });
        }
        if (turma.tipo === TipoTurma.INTEGRAL && turma.horario_inicio_segundo_intervalo && turma.horario_fim_segundo_intervalo) {
            scheduleItems.push({
                type: 'break',
                startTime: turma.horario_inicio_segundo_intervalo,
                data: { name: 'Intervalo' }
            });
        }
    
        scheduleItems.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
        return scheduleItems;
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {diasDaSemana.map(({ short, long }) => {
                    const aulasDoDia = schedule.filter(aula => normalizeDay(aula.dia_da_semana) === short);
                    const fullDaySchedule = generateFullDaySchedule(turma, aulasDoDia);

                    return (
                        <div key={long} className="bg-[#f6f6f6] rounded-lg p-3 space-y-2 border border-gray-200">
                            <h3 className="font-bold text-center text-gray-800 border-b border-gray-300 pb-2">{long}</h3>
                             <div className="space-y-2 pt-1">
                                {fullDaySchedule.length > 0 ? (
                                    fullDaySchedule.map((item, index) => {
                                        if (item.type === 'aula') {
                                            return <AulaCard key={`aula-${index}`} aula={item.data} />;
                                        } else {
                                            return <BreakDivider key={`break-${index}`} name={item.data.name} />;
                                        }
                                    })
                                ) : (
                                    <div className="flex items-center justify-center h-full min-h-[100px]">
                                        <p className="text-center text-xs text-gray-400">Nenhuma aula neste dia</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TimetableGrid;