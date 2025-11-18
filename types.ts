import { User } from '@supabase/supabase-js';

export enum Cargo {
    DIRETOR = 'Diretor',
    VICE_DIRETOR = 'Vice-Diretor',
    SUPERVISOR = 'Supervisor',
    PROFESSOR = 'Professor'
}

export enum StatusUsuario {
    APROVADO = 'Aprovado',
    PENDENTE = 'Pendente',
    NEGADO = 'Negado'
}

export interface Usuario {
    id: string;
    id_escola?: string | null;
    nome: string;
    email: string;
    cargo: Cargo;
    telefone?: string | null;
    status: StatusUsuario;
    criado_em: string;
    avatar_url?: string | null;
}

export interface Materia {
    id: number;
    nome: string;
}

export interface AppUser extends User {
    profile?: Usuario;
}

export enum TipoTurma {
    PARCIAL = 'Parcial',
    INTEGRAL = 'Integral'
}

export interface TurmaMateriaProfessor {
    id_materia: number;
    id_professor: string;
    quantidade_aulas: number;
}

export interface Turma {
    id: number;
    nome: string;
    tipo: TipoTurma;
    sexto_horario: boolean;
    horario_gerado: boolean;
    horario_inicio: string; // "HH:mm"
    horario_fim: string; // "HH:mm"
    horario_inicio_primeiro_intervalo: string; // "HH:mm"
    horario_fim_primeiro_intervalo: string; // "HH:mm"
    horario_inicio_almoco?: string | null; // "HH:mm"
    horario_fim_almoco?: string | null; // "HH:mm"
    horario_inicio_segundo_intervalo?: string | null; // "HH:mm"
    horario_fim_segundo_intervalo?: string | null; // "HH:mm"
    materias_professores: TurmaMateriaProfessor[]; 
    criado_em: string;
}

export const DiasSemana = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
];

export interface Compromisso {
    id: number;
    id_professor: string;
    local: string;
    dias_semana: string[];
    horario_inicio: string; // "HH:mm"
    horario_fim: string; // "HH:mm"
    criado_em: string;
    // Campos adicionados para joins
    usuarios?: { nome: string };
}

export interface SolicitacaoExclusaoCompromisso {
    id: number;
    id_compromisso: number;
    status: 'pendente' | 'aprovado' | 'negado';
    criado_em: string;
    compromissos: {
        local: string;
        dias_semana: string[];
        horario_inicio: string;
        horario_fim: string;
        usuarios: {
            nome: string;
        }
    } | null;
}

export interface HorarioGerado {
    id?: number;
    id_turma: number;
    id_materia: number;
    id_professor: string;
    dia_da_semana: string;
    horario_inicio: string;
    horario_fim: string;
    origem_ia: boolean;
    criado_em?: string;

    // Propriedade para renderização, não salva no DB
    periodo?: number;

    // Propriedades para exibir nomes na grade
    materias?: { nome: string };
    usuarios?: { nome: string };
    turmas?: { nome: string };
}