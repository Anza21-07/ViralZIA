/// <reference lib="dom" />
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import Loader from '../common/Loader';
import { User } from '@supabase/supabase-js';
import { AccessRequest } from '../../types';

const AdminView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'requests'>('requests');

    // Users State
    const [users, setUsers] = useState<User[]>([]);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [userError, setUserError] = useState('');
    
    // Requests State
    const [requests, setRequests] = useState<AccessRequest[]>([]);
    const [isRequestsLoading, setIsRequestsLoading] = useState(false);
    const [requestError, setRequestError] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Invite State
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteMessage, setInviteMessage] = useState('');

    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPass, setIsChangingPass] = useState(false);
    const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Delete State
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // --- HELPER: SMART REDIRECT URL ---
    const getRedirectUrl = () => {
        // Si el admin está en localhost, forzamos la redirección a la URL de producción
        // para que el usuario invitado llegue al sitio correcto.
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'https://viral-zia.vercel.app/'; 
        }
        // Si ya estamos en producción (o en otra URL), usamos la actual.
        return window.location.origin;
    };

    const fetchUsers = useCallback(async () => {
        setIsUsersLoading(true);
        setUserError('');
        try {
            const { data, error } = await supabase.functions.invoke('list-users');
            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setUsers(data.users || []);
        } catch (err: any) {
            console.error("Error fetching users:", err);
            const errorMessage = err.message || '';
            if (errorMessage.includes("Failed to send a request") || errorMessage.includes("relay: 404")) {
                 setUserError("FUNCTIONS_NOT_DEPLOYED");
            } else {
                 setUserError(errorMessage);
            }
            setUsers([]);
        } finally {
            setIsUsersLoading(false);
        }
    }, []);

    const fetchRequests = useCallback(async () => {
        setIsRequestsLoading(true);
        setRequestError('');
        try {
            const { data, error } = await supabase
                .from('access_requests')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setRequests(data as AccessRequest[]);
        } catch (err: any) {
            console.error(err);
            setRequestError('Error cargando solicitudes');
        } finally {
            setIsRequestsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'requests') fetchRequests();
    }, [activeTab, fetchUsers, fetchRequests]);

    const handleApproveRequest = async (request: AccessRequest) => {
        if (!window.confirm(`¿Aprobar a ${request.name} (${request.email})? Esto le enviará una invitación.`)) return;
        
        setProcessingId(request.id);
        
        try {
            // 1. Invocar Edge Function para invitar
            const { data, error: inviteError } = await supabase.functions.invoke('invite-user', {
                body: { 
                    email: request.email,
                    redirectTo: getRedirectUrl() 
                },
            });

            if (inviteError) throw inviteError;
            if (data.error) throw new Error(data.error);

            // 2. Actualizar estado en DB local
            const { error: dbError } = await supabase
                .from('access_requests')
                .update({ status: 'approved' })
                .eq('id', request.id);

            if (dbError) throw dbError;

            // 3. Refrescar lista
            setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'approved' } : r));
            alert(`Invitación enviada a ${request.email}`);

        } catch (err: any) {
            console.error(err);
            alert(`Error al aprobar: ${err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleResendInvite = async (request: AccessRequest) => {
        if (!window.confirm(`¿Reenviar invitación a ${request.email}?`)) return;
        
        setProcessingId(request.id);
        
        try {
            const { data, error: inviteError } = await supabase.functions.invoke('invite-user', {
                body: { 
                    email: request.email,
                    redirectTo: getRedirectUrl() 
                },
            });

            if (inviteError) throw inviteError;
            
            if (data && data.userExists) {
                 alert(`El usuario ya está registrado. ${data.message}`);
            } else if (data.error) {
                 throw new Error(data.error);
            } else {
                 alert(`Nueva invitación enviada correctamente a ${request.email}`);
            }

        } catch (err: any) {
            console.error(err);
            alert(`Error al reenviar: ${err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        if (!window.confirm("¿Rechazar esta solicitud?")) return;
        setProcessingId(requestId);
        try {
             const { error } = await supabase
                .from('access_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);
            if (error) throw error;
            setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
        } catch (err: any) {
            console.error(err);
            alert("Error al rechazar");
        } finally {
            setProcessingId(null);
        }
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setIsInviting(true);
        setInviteMessage('');
        setUserError('');

        try {
            const { data, error } = await supabase.functions.invoke('invite-user', {
                body: { 
                    email: inviteEmail,
                    redirectTo: getRedirectUrl()
                },
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setInviteMessage(`Invitación enviada con éxito a ${inviteEmail}.`);
            setInviteEmail('');
            if (activeTab === 'users') fetchUsers(); 
        } catch (err: any) {
            console.error("Error inviting user:", err);
            if (err.message.includes("Failed to send a request") || err.message.includes("relay: 404")) {
                setUserError("FUNCTIONS_NOT_DEPLOYED");
            } else {
                setUserError(err.message || 'Error al invitar al usuario.');
            }
        } finally {
            setIsInviting(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassMessage(null);

        if (newPassword.length < 6) {
            setPassMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPassMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            return;
        }

        setIsChangingPass(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setPassMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error("Error updating password:", err);
            setPassMessage({ type: 'error', text: err.message || 'Error al actualizar la contraseña.' });
        } finally {
            setIsChangingPass(false);
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (!window.confirm(`¿Estás SEGURO de que quieres eliminar permanentemente al usuario ${userEmail}? Esta acción borrará todos sus datos y no se puede deshacer.`)) {
            return;
        }

        setIsDeleting(userId);
        setUserError('');

        try {
             const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { user_id: userId },
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            // Refresh list
            setUsers(users.filter(u => u.id !== userId));
            alert(`Usuario ${userEmail} eliminado correctamente.`);

        } catch (err: any) {
            console.error("Error deleting user:", err);
             if (err.message.includes("Failed to send a request") || err.message.includes("relay: 404")) {
                setUserError("FUNCTIONS_NOT_DEPLOYED");
            } else {
                alert(`Error al eliminar: ${err.message}`);
            }
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-fadeIn">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Panel de Administración</h2>
                <p className="text-slate-400 mt-2">Gestión total del sistema y usuarios.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center space-x-4 border-b border-slate-700/50 pb-4">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'requests' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    📩 Solicitudes de Acceso
                </button>
                 <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'users' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    👥 Usuarios Activos
                </button>
            </div>

            {activeTab === 'requests' && (
                <div className="max-w-6xl mx-auto bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl shadow-2xl space-y-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Cola de Solicitudes</h3>
                     {isRequestsLoading ? (
                         <div className="flex justify-center p-4"><Loader message="Cargando solicitudes..." /></div>
                     ) : requestError ? (
                         <p className="text-red-400">{requestError}</p>
                     ) : requests.length === 0 ? (
                         <p className="text-slate-400 text-center py-8">No hay solicitudes pendientes.</p>
                     ) : (
                        <div className="space-y-4">
                            {requests.map(req => (
                                <div key={req.id} className={`p-5 rounded-xl border ${req.status === 'pending' ? 'bg-slate-700/30 border-slate-600/50' : req.status === 'approved' ? 'bg-green-900/20 border-green-800/50 opacity-75' : 'bg-red-900/20 border-red-800/50 opacity-50'} flex flex-col md:flex-row justify-between gap-6`}>
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-white text-lg">{req.name}</h4>
                                            <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase font-bold ${req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : req.status === 'approved' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                {req.status}
                                            </span>
                                            <span className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-purple-300 font-medium mt-1">{req.email}</p>
                                        <p className="text-slate-300 mt-2 text-sm italic bg-slate-900/30 p-2 rounded">"{req.reason}"</p>
                                    </div>
                                    
                                    {req.status === 'pending' && (
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <button
                                                onClick={() => handleApproveRequest(req)}
                                                disabled={!!processingId}
                                                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
                                            >
                                                {processingId === req.id ? 'Procesando...' : 'Aprobar e Invitar'}
                                            </button>
                                            <button
                                                onClick={() => handleRejectRequest(req.id)}
                                                disabled={!!processingId}
                                                className="bg-red-900/30 hover:bg-red-900/50 text-red-200 px-4 py-2.5 rounded-lg font-medium border border-red-800/30 transition-all disabled:opacity-50"
                                            >
                                                Rechazar
                                            </button>
                                        </div>
                                    )}

                                    {/* Botón de Reenvío para Aprobados */}
                                    {req.status === 'approved' && (
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResendInvite(req); }}
                                                disabled={!!processingId}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                                            >
                                                <span>📨</span>
                                                {processingId === req.id ? 'Enviando...' : 'Reenviar Invitación'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            )}

            {activeTab === 'users' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                        {/* Card 1: Invite User */}
                        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-xl shadow-lg space-y-4">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <span>📧</span> Invitar Manualmente
                            </h3>
                            <form onSubmit={handleInvite} className="space-y-3">
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.currentTarget ? e.currentTarget.value : e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                    required
                                    className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={isInviting || userError === 'FUNCTIONS_NOT_DEPLOYED'}
                                    className="w-full bg-purple-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-purple-500 disabled:bg-slate-600 transition-colors"
                                >
                                    {isInviting ? 'Enviando...' : 'Enviar Invitación'}
                                </button>
                            </form>
                            {inviteMessage && <p className="text-green-400 text-sm mt-2 bg-green-900/20 p-2 rounded">{inviteMessage}</p>}
                        </div>

                        {/* Card 2: Change Admin Password */}
                        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-xl shadow-lg space-y-4">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <span>🔐</span> Mi Seguridad (Admin)
                            </h3>
                            <form onSubmit={handleChangePassword} className="space-y-3">
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.currentTarget ? e.currentTarget.value : e.target.value)}
                                    placeholder="Nueva contraseña"
                                    required
                                    className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-white"
                                />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.currentTarget ? e.currentTarget.value : e.target.value)}
                                    placeholder="Confirmar contraseña"
                                    required
                                    className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={isChangingPass}
                                    className="w-full bg-pink-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-pink-500 disabled:bg-slate-600 transition-colors"
                                >
                                    {isChangingPass ? 'Actualizando...' : 'Actualizar Contraseña'}
                                </button>
                            </form>
                            {passMessage && (
                                <p className={`text-sm mt-2 p-2 rounded ${passMessage.type === 'success' ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                                    {passMessage.text}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* User List Section */}
                    <div className="max-w-6xl mx-auto bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl shadow-xl space-y-4">
                        <h3 className="text-xl font-semibold text-white">Usuarios Registrados</h3>
                        {isUsersLoading ? (
                            <div className="flex justify-center">
                                <Loader message="Cargando usuarios..." />
                            </div>
                        ) : userError === 'FUNCTIONS_NOT_DEPLOYED' ? (
                            <div className="bg-slate-700/30 border border-yellow-600/50 p-6 rounded-xl text-center space-y-4">
                                <div className="w-16 h-16 bg-yellow-900/50 rounded-full flex items-center justify-center mx-auto text-yellow-500 text-2xl">⚠️</div>
                                <h3 className="text-xl font-bold text-white">Funciones de Servidor No Detectadas</h3>
                                <p className="text-slate-300">El Panel de Administración requiere que despliegues las "Edge Functions" en Supabase.</p>
                                <button onClick={fetchUsers} className="mt-4 bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-500 transition-colors">Reintentar Conexión</button>
                            </div>
                        ) : users.length === 0 ? (
                            <p className="text-center text-slate-400">No hay usuarios registrados.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                                <table className="min-w-full text-left text-sm whitespace-nowrap">
                                    <thead className="uppercase tracking-wider border-b border-slate-700/50 bg-slate-900/60 text-slate-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-4">Email</th>
                                            <th scope="col" className="px-6 py-4">ID Usuario</th>
                                            <th scope="col" className="px-6 py-4">Último Acceso</th>
                                            <th scope="col" className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30">
                                        {users.map((user) => (
                                            <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">{user.email}</td>
                                                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{user.id}</td>
                                                <td className="px-6 py-4 text-slate-400">
                                                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Nunca'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {user.email !== 'miura.force@gmail.com' && (
                                                        <button 
                                                            onClick={() => user.email && handleDeleteUser(user.id, user.email)}
                                                            disabled={isDeleting === user.id}
                                                            className="text-red-400 hover:text-red-200 hover:underline text-xs font-bold disabled:opacity-50"
                                                        >
                                                            {isDeleting === user.id ? 'Eliminando...' : 'Eliminar'}
                                                        </button>
                                                    )}
                                                    {user.email === 'miura.force@gmail.com' && (
                                                        <span className="text-xs text-green-400 font-mono px-2 py-1 bg-green-900/30 rounded border border-green-800/30">ADMIN</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminView;