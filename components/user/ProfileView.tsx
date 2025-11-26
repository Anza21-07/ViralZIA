
/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { useAppStore } from '../../store/appStore';

interface ProfileViewProps {
    setCurrentView: (view: any) => void; // Using any to avoid circular dependency issues in types if needed
}

const ProfileView: React.FC<ProfileViewProps> = ({ setCurrentView }) => {
    const [user, setUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPass, setIsChangingPass] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const brandKit = useAppStore(state => state.brandKit);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            return;
        }

        setIsChangingPass(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error("Error updating password:", err);
            setMessage({ type: 'error', text: err.message || 'Error al actualizar la contraseña.' });
        } finally {
            setIsChangingPass(false);
        }
    };

    if (!user) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-fadeIn">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Mi Perfil</h2>
                <p className="text-slate-400 mt-2">Gestiona tu cuenta y seguridad.</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
                
                {/* Info Card */}
                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl shadow-2xl">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-purple-500/30">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">{user.email}</h3>
                            <p className="text-sm text-slate-400">ID: <span className="font-mono text-slate-500">{user.id}</span></p>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex justify-between items-center">
                         <div>
                            <h4 className="font-semibold text-slate-200">Kit de Marca Personal</h4>
                            <p className="text-sm text-slate-400">
                                {brandKit?.tone_of_voice ? '✅ Configurado' : '⚠️ No configurado'}
                            </p>
                         </div>
                         <button 
                            onClick={() => setCurrentView('brandKit')}
                            className="text-purple-400 hover:text-purple-300 text-sm font-bold hover:underline"
                         >
                            Editar Kit
                         </button>
                    </div>
                </div>

                {/* Security Card */}
                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl shadow-2xl">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
                        <span>🔐</span> Cambiar Contraseña
                    </h3>
                    
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.currentTarget ? e.currentTarget.value : e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                required
                                className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.currentTarget ? e.currentTarget.value : e.target.value)}
                                placeholder="Repite la contraseña"
                                required
                                className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-white"
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={isChangingPass}
                            className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-blue-500 disabled:bg-slate-600 transition-colors shadow-lg shadow-blue-500/20 mt-2"
                        >
                            {isChangingPass ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
                        </button>
                    </form>

                    {message && (
                        <div className={`mt-4 p-3 rounded-lg text-center border ${message.type === 'success' ? 'bg-green-900/20 text-green-400 border-green-800/30' : 'bg-red-900/20 text-red-400 border-red-800/30'}`}>
                            {message.text}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ProfileView;