import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Usuario } from '../../types';
import { ChevronLeftIcon, PencilIcon, UserCircleIcon, CameraIcon, BriefcaseIcon, PhoneIcon } from '../icons/Icons';

interface ProfilePageProps {
    userProfile: Usuario;
    onProfileUpdate: (options?: { refreshSession?: boolean }) => void;
    onNavigateBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile, onProfileUpdate, onNavigateBack }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [nome, setNome] = useState(userProfile.nome);
    const [telefone, setTelefone] = useState(userProfile.telefone || '');
    
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isEditing) {
            setNome(userProfile.nome);
            setTelefone(userProfile.telefone || '');
        }
    }, [userProfile, isEditing]);
    
    const handleCancelEdit = () => {
        setIsEditing(false);
        setError(null);
    };

    const formatTelefone = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{0,2})(\d{0,1})(\d{0,4})(\d{0,4})$/);
        if (!match) return '';
        let formatted = '';
        if (match[1]) formatted += `(${match[1]}`;
        if (match[2]) formatted += `) ${match[2]}`;
        if (match[3]) formatted += ` ${match[3]}`;
        if (match[4]) formatted += `-${match[4]}`;
        return formatted;
    };
    
    const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTelefone(formatTelefone(e.target.value));
    };

    const generateFriendlyError = (errorMessage: string, context: 'upload' | 'update') => {
        const prefix = context === 'upload' ? 'Falha no upload da imagem' : 'Falha ao atualizar perfil';
        if (errorMessage && (errorMessage.toLowerCase().includes('rls') || errorMessage.toLowerCase().includes('policy') || errorMessage.toLowerCase().includes('permission'))) {
            return `${prefix}. Verifique as permissões de segurança (Row Level Security) no Supabase. O usuário logado precisa ter permissão para atualizar a própria linha na tabela "usuarios"!`;
        }
        return `${prefix}: ${errorMessage}`;
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `fotos/${userProfile.id}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = `${data.publicUrl}?t=${new Date().getTime()}`;

            const { data: updatedUserData, error: updateUserError } = await supabase
                .from('usuarios')
                .update({ avatar_url: publicUrl })
                .eq('id', userProfile.id)
                .select();
            
            if (updateUserError) throw updateUserError;
            if (!updatedUserData || updatedUserData.length === 0) {
                 throw new Error("RLS policy prevented update");
            }
            
            await onProfileUpdate({ refreshSession: true });

        } catch (error: any) {
            setError(generateFriendlyError(error.message, 'upload'));
        } finally {
            setUploading(false);
        }
    };
    
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const cleanedTelefone = telefone.replace(/\D/g, '');
            const userId = userProfile.id;

            const { data: updatedProfileData, error: profileError } = await supabase
                .from('usuarios')
                .update({ nome, telefone: cleanedTelefone })
                .eq('id', userId)
                .select(); 

            if (profileError) {
                throw profileError; 
            }
            if (!updatedProfileData || updatedProfileData.length === 0) {
                throw new Error("RLS policy prevented update");
            }

            await onProfileUpdate();
            setIsEditing(false);

        } catch (error: any) {
             setError(generateFriendlyError(error.message, 'update'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <form onSubmit={handleUpdateProfile}>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                        <button type="button" onClick={onNavigateBack} className="p-1 rounded-full hover:bg-[#f6f6f6]" aria-label="Voltar">
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                        <span>Meu Perfil</span>
                    </h1>
                    
                     {!isEditing ? (
                         <div>
                             <button type="button" onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                                 <PencilIcon className="w-4 h-4"/>
                                 Editar Perfil
                             </button>
                         </div>
                     ) : (
                          <div className="flex justify-end space-x-3">
                             <button type="button" onClick={handleCancelEdit} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                                 Cancelar
                             </button>
                             <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                                 {submitting ? 'Salvando...' : 'Salvar'}
                             </button>
                         </div>
                     )}
                </div>

                <div className="space-y-6">
                    {error && <div className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>}
                    
                    {/* Main Info Card */}
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            <div className="relative group flex-shrink-0">
                                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/png, image/jpeg" className="hidden" disabled={uploading}/>
                                {userProfile.avatar_url ? (
                                    <img src={userProfile.avatar_url} alt="Avatar" className="h-28 w-28 rounded-full object-cover shadow-md" />
                                ) : (
                                    <UserCircleIcon className="h-28 w-28 text-gray-400" />
                                )}
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-opacity duration-300 cursor-pointer">
                                    {!uploading && <CameraIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </button>
                                {uploading && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-white border-dashed rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            <div className="w-full text-center sm:text-left">
                                <label htmlFor="nome" className="text-sm font-medium text-gray-500">Nome Completo</label>
                                {!isEditing ? (
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{userProfile.nome}</p>
                                ) : (
                                    <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-[#f6f6f6] text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg" />
                                )}
                                
                                <label className="text-sm font-medium text-gray-500 mt-3 block">Email</label>
                                <p className="text-gray-700">{userProfile.email}</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Details Cards */}
                    <div className="bg-white shadow-md rounded-lg p-4 flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-full"><BriefcaseIcon className="h-6 w-6 text-blue-600" /></div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Cargo</label>
                            <p className="font-semibold text-gray-900">{userProfile.cargo}</p>
                        </div>
                    </div>

                    <div className="bg-white shadow-md rounded-lg p-4 flex items-center gap-4">
                        <div className="p-2 bg-green-100 rounded-full"><PhoneIcon className="h-6 w-6 text-green-600" /></div>
                        <div className="w-full">
                            <label htmlFor="telefone" className="text-sm font-medium text-gray-500">Telefone</label>
                            {!isEditing ? (
                                <p className="font-semibold text-gray-900">{formatTelefone(userProfile.telefone || '') || 'Não informado'}</p>
                            ) : (
                                <input id="telefone" type="tel" value={telefone} onChange={handleTelefoneChange} maxLength={16} className="block w-full bg-transparent font-semibold text-gray-900 focus:outline-none p-0 border-0 border-b-2 border-gray-300 focus:ring-0 focus:border-blue-500 transition" placeholder="(00) 0 0000-0000"/>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ProfilePage;