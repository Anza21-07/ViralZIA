
/// <reference lib="dom" />
import React, { useState, useEffect, useCallback } from 'react';
import { useSessionStore, useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import { ProjectStatus, MetricEntry, AppView } from '../types';
import Loader from './common/Loader';
import { downloadCsv, toSnakeCase } from '../services/utils';

interface PerformanceViewProps {
    // Optional props if needed in future
}

const STATUS_STEPS: { id: ProjectStatus; label: string; icon: string; color: string }[] = [
    { id: 'idea', label: 'Idea', icon: '💡', color: 'bg-slate-600' },
    { id: 'scripting', label: 'Guion', icon: '📝', color: 'bg-blue-600' },
    { id: 'production', label: 'Producción', icon: '🎬', color: 'bg-purple-600' },
    { id: 'published', label: 'Publicado', icon: '🚀', color: 'bg-green-600' },
    { id: 'viral', label: 'Viral', icon: '🔥', color: 'bg-orange-600' },
];

const PerformanceView: React.FC = () => {
    const session = useSessionStore();
    const [status, setStatus] = useState<ProjectStatus>(session.status || 'idea');
    
    // Audit State
    const [pubTitle, setPubTitle] = useState(session.published_title || '');
    const [pubDesc, setPubDesc] = useState(session.published_description || '');
    const [pubUrl, setPubUrl] = useState(session.published_url || '');
    const [isSavingAudit, setIsSavingAudit] = useState(false);

    // Metrics State
    const [metrics, setMetrics] = useState<MetricEntry[]>([]);
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
    
    // Add New Metric State
    const [newMetric, setNewMetric] = useState<Partial<MetricEntry>>({
        platform: 'TikTok',
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        watch_time_avg: ''
    });
    const [isSavingMetric, setIsSavingMetric] = useState(false);

    // Edit Metric State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<MetricEntry>>({});

    // Fetch metrics on mount
    const fetchMetrics = useCallback(async () => {
        if (!session.id) return;
        setIsLoadingMetrics(true);
        try {
            const { data, error } = await supabase
                .from('project_metrics')
                .select('*')
                .eq('session_id', session.id)
                .order('recorded_at', { ascending: false });

            if (error) throw error;
            setMetrics(data as MetricEntry[]);
        } catch (err) {
            console.error("Error fetching metrics:", err);
        } finally {
            setIsLoadingMetrics(false);
        }
    }, [session.id]);

    useEffect(() => {
        setStatus(session.status || 'idea');
        setPubTitle(session.published_title || '');
        setPubDesc(session.published_description || '');
        setPubUrl(session.published_url || '');
        fetchMetrics();
    }, [session.id, session.status, session.published_title, session.published_description, session.published_url, fetchMetrics]);

    const handleStatusChange = async (newStatus: ProjectStatus) => {
        setStatus(newStatus);
        // Update Supabase immediately
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !session.id) return;

        await supabase.from('sessions').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', session.id);
    };

    const handleSaveAudit = async () => {
        setIsSavingAudit(true);
        try {
             const { data: { user } } = await supabase.auth.getUser();
             if (!user || !session.id) return;

             const updates = {
                 published_title: pubTitle,
                 published_description: pubDesc,
                 published_url: pubUrl,
                 published_at: status === 'published' || status === 'viral' ? new Date().toISOString() : null,
                 updated_at: new Date().toISOString()
             };

             const { error } = await supabase.from('sessions').update(updates).eq('id', session.id);
             if (error) throw error;
             alert("Datos de auditoría guardados correctamente.");
        } catch (err: any) {
            console.error(err);
            alert("Error al guardar auditoría.");
        } finally {
            setIsSavingAudit(false);
        }
    };

    const handleAddMetric = async () => {
        setIsSavingMetric(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !session.id) return;

            const { error } = await supabase.from('project_metrics').insert({
                session_id: session.id,
                user_id: user.id,
                platform: newMetric.platform,
                views: newMetric.views,
                likes: newMetric.likes,
                comments: newMetric.comments,
                shares: newMetric.shares,
                saves: newMetric.saves,
                watch_time_avg: newMetric.watch_time_avg,
                recorded_at: new Date().toISOString()
            });

            if (error) throw error;
            
            // Refresh list
            await fetchMetrics();
            // Reset form
            setNewMetric({
                platform: 'TikTok',
                views: 0, likes: 0, comments: 0, shares: 0, saves: 0, watch_time_avg: ''
            });

        } catch (err: any) {
            console.error(err);
            alert("Error al guardar métrica.");
        } finally {
            setIsSavingMetric(false);
        }
    };

    const startEditing = (metric: MetricEntry) => {
        setEditingId(metric.id);
        setEditValues(metric);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValues({});
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        
        try {
            const { error } = await supabase
                .from('project_metrics')
                .update({
                    views: editValues.views,
                    likes: editValues.likes,
                    comments: editValues.comments,
                    shares: editValues.shares,
                    saves: editValues.saves,
                    watch_time_avg: editValues.watch_time_avg,
                    platform: editValues.platform
                })
                .eq('id', editingId);

            if (error) throw error;

            // Update local state optimistically
            setMetrics(metrics.map(m => m.id === editingId ? { ...m, ...editValues } as MetricEntry : m));
            setEditingId(null);
        } catch (err: any) {
            console.error(err);
            alert("Error al actualizar la métrica.");
        }
    };

    const handleDeleteMetric = async (id: string) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este registro de métricas?")) return;

        try {
            const { error } = await supabase
                .from('project_metrics')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setMetrics(metrics.filter(m => m.id !== id));
        } catch (err: any) {
            console.error(err);
            alert("Error al eliminar la métrica: " + err.message);
        }
    };

    const handleExportCsv = () => {
        if (metrics.length === 0) {
            alert("No hay métricas para exportar.");
            return;
        }
        
        // Enhance data for export
        const exportData = metrics.map(m => ({
            Fecha: new Date(m.recorded_at).toLocaleDateString() + ' ' + new Date(m.recorded_at).toLocaleTimeString(),
            Plataforma: m.platform,
            Vistas: m.views,
            Likes: m.likes,
            Comentarios: m.comments,
            Compartidos: m.shares,
            Guardados: m.saves,
            'Tiempo Medio': m.watch_time_avg,
            'Título Sesión': session.title
        }));

        downloadCsv(exportData, `metricas_${toSnakeCase(session.title || 'proyecto')}.csv`);
    };

    if (!session.id || session.title === 'Nueva Sesión') {
        return (
            <div className="container mx-auto p-8 text-center animate-fadeIn">
                <div className="bg-slate-800/50 p-10 rounded-2xl border border-slate-700/50 backdrop-blur-md">
                    <h2 className="text-3xl font-bold text-slate-300 mb-4">Centro de Mando Inactivo</h2>
                    <p className="text-slate-400 mb-6">Por favor, carga una sesión existente desde "Mis Análisis" o crea un guion primero para empezar a medir su rendimiento.</p>
                </div>
            </div>
        );
    }

    // Helper to find AI generated content for comparison
    const aiTitle = session.social_metadata?.[0]?.viralTitles?.[0] || session.generated_scripts?.[0]?.title || "No generado aún";
    const aiDesc = session.social_metadata?.[0]?.description || "No generado aún";

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-fadeIn">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                    Centro de Rendimiento
                </h2>
                <p className="text-slate-400 mt-2">Gestiona el ciclo de vida de "{session.title}" y mide su impacto.</p>
            </div>

            {/* 1. WORKFLOW STATUS BAR */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md overflow-x-auto">
                <div className="flex justify-between items-center min-w-[600px]">
                    {STATUS_STEPS.map((step, index) => {
                        const isActive = status === step.id;
                        const isPast = STATUS_STEPS.findIndex(s => s.id === status) > index;
                        
                        return (
                            <div key={step.id} className="flex flex-col items-center relative z-10 group cursor-pointer" onClick={() => handleStatusChange(step.id)}>
                                <div 
                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg transition-all duration-300 border-2 
                                    ${isActive ? `${step.color} border-white scale-110` : isPast ? `${step.color} border-transparent opacity-50` : 'bg-slate-800 border-slate-600 text-slate-500'}`}
                                >
                                    {step.icon}
                                </div>
                                <span className={`mt-2 text-xs font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                    {step.label}
                                </span>
                                {/* Connector Line */}
                                {index < STATUS_STEPS.length - 1 && (
                                    <div className={`absolute top-6 left-1/2 w-[calc(100vw/5)] h-1 -z-10 ${isPast ? 'bg-green-900' : 'bg-slate-800'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT COLUMN: AUDIT & COMPARISON */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 shadow-xl">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>🕵️‍♂️</span> Auditoría de Publicación
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Título Generado por IA</label>
                                <div className="p-3 bg-slate-900/50 rounded-lg text-sm text-slate-400 italic border border-slate-800">
                                    {aiTitle}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-green-400 uppercase font-bold mb-1">Título Realmente Usado</label>
                                <input 
                                    type="text" 
                                    value={pubTitle}
                                    onChange={(e) => setPubTitle(e.target.value)}
                                    placeholder="¿Qué título pusiste al final?"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Descripción IA</label>
                                <div className="p-3 bg-slate-900/50 rounded-lg text-xs text-slate-400 italic border border-slate-800 h-20 overflow-y-auto custom-scrollbar">
                                    {aiDesc}
                                </div>
                            </div>

                             <div>
                                <label className="block text-xs text-green-400 uppercase font-bold mb-1">Link de Publicación</label>
                                <input 
                                    type="text" 
                                    value={pubUrl}
                                    onChange={(e) => setPubUrl(e.target.value)}
                                    placeholder="https://tiktok.com/..."
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                                />
                            </div>

                            <button 
                                onClick={handleSaveAudit}
                                disabled={isSavingAudit}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-colors text-sm border border-slate-600"
                            >
                                {isSavingAudit ? 'Guardando...' : 'Guardar Auditoría'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: METRICS LOG */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 shadow-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span>📈</span> Bitácora de Métricas
                            </h3>
                            <button 
                                onClick={handleExportCsv}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm shadow-lg shadow-green-500/20 flex items-center gap-2"
                            >
                                <span>📊</span> Exportar a Excel/Sheets
                            </button>
                        </div>

                        {/* Input Form */}
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-xs text-slate-500 font-bold">Plataforma</label>
                                <select 
                                    value={newMetric.platform}
                                    onChange={(e) => setNewMetric({...newMetric, platform: e.target.value as any})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm mt-1"
                                >
                                    <option value="TikTok">TikTok</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="YouTube">YouTube</option>
                                    <option value="Other">Otro</option>
                                </select>
                            </div>
                             <div className="col-span-1">
                                <label className="text-xs text-slate-500 font-bold">Vistas</label>
                                <input 
                                    type="number" 
                                    value={newMetric.views}
                                    onChange={(e) => setNewMetric({...newMetric, views: parseInt(e.target.value) || 0})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm mt-1"
                                />
                            </div>
                             <div className="col-span-1">
                                <label className="text-xs text-slate-500 font-bold">Likes</label>
                                <input 
                                    type="number" 
                                    value={newMetric.likes}
                                    onChange={(e) => setNewMetric({...newMetric, likes: parseInt(e.target.value) || 0})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm mt-1"
                                />
                            </div>
                             <div className="col-span-1">
                                <label className="text-xs text-slate-500 font-bold">Comentarios</label>
                                <input 
                                    type="number" 
                                    value={newMetric.comments}
                                    onChange={(e) => setNewMetric({...newMetric, comments: parseInt(e.target.value) || 0})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm mt-1"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs text-slate-500 font-bold">Compartidos</label>
                                <input 
                                    type="number" 
                                    value={newMetric.shares}
                                    onChange={(e) => setNewMetric({...newMetric, shares: parseInt(e.target.value) || 0})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm mt-1"
                                />
                            </div>
                             <div className="col-span-1">
                                <label className="text-xs text-slate-500 font-bold">Guardados</label>
                                <input 
                                    type="number" 
                                    value={newMetric.saves}
                                    onChange={(e) => setNewMetric({...newMetric, saves: parseInt(e.target.value) || 0})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm mt-1"
                                />
                            </div>
                             <div className="col-span-1">
                                <label className="text-xs text-slate-500 font-bold">Retención Avg</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: 10s"
                                    value={newMetric.watch_time_avg}
                                    onChange={(e) => setNewMetric({...newMetric, watch_time_avg: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm mt-1"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1 flex items-end">
                                <button 
                                    onClick={handleAddMetric}
                                    disabled={isSavingMetric}
                                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded transition-colors text-sm shadow-lg"
                                >
                                    {isSavingMetric ? '...' : '+ Registrar'}
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-900/80">
                                    <tr>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Plat</th>
                                        <th className="px-4 py-3">Vistas</th>
                                        <th className="px-4 py-3">Likes</th>
                                        <th className="px-4 py-3">Coms</th>
                                        <th className="px-4 py-3">Shares</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {metrics.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No hay métricas registradas aún.</td>
                                        </tr>
                                    ) : (
                                        metrics.map(m => {
                                            const isEditing = editingId === m.id;
                                            return (
                                                <tr key={m.id} className={`hover:bg-slate-700/20 transition-colors ${isEditing ? 'bg-slate-800/50' : ''}`}>
                                                    <td className="px-4 py-3 text-xs font-mono">
                                                        {new Date(m.recorded_at).toLocaleDateString()}
                                                    </td>
                                                    
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <select 
                                                                value={editValues.platform}
                                                                onChange={(e) => setEditValues({...editValues, platform: e.target.value as any})}
                                                                className="bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs w-20"
                                                            >
                                                                <option value="TikTok">TikTok</option>
                                                                <option value="Instagram">IG</option>
                                                                <option value="YouTube">YT</option>
                                                            </select>
                                                        ) : m.platform}
                                                    </td>

                                                    <td className="px-4 py-3 font-bold text-white">
                                                        {isEditing ? (
                                                             <input 
                                                                type="number" 
                                                                value={editValues.views}
                                                                onChange={(e) => setEditValues({...editValues, views: parseInt(e.target.value) || 0})}
                                                                className="bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs w-16"
                                                            />
                                                        ) : m.views.toLocaleString()}
                                                    </td>

                                                    <td className="px-4 py-3 text-green-300">
                                                        {isEditing ? (
                                                             <input 
                                                                type="number" 
                                                                value={editValues.likes}
                                                                onChange={(e) => setEditValues({...editValues, likes: parseInt(e.target.value) || 0})}
                                                                className="bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs w-16"
                                                            />
                                                        ) : m.likes.toLocaleString()}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                             <input 
                                                                type="number" 
                                                                value={editValues.comments}
                                                                onChange={(e) => setEditValues({...editValues, comments: parseInt(e.target.value) || 0})}
                                                                className="bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs w-12"
                                                            />
                                                        ) : m.comments}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                             <input 
                                                                type="number" 
                                                                value={editValues.shares}
                                                                onChange={(e) => setEditValues({...editValues, shares: parseInt(e.target.value) || 0})}
                                                                className="bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs w-12"
                                                            />
                                                        ) : m.shares}
                                                    </td>

                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {isEditing ? (
                                                                <>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={handleSaveEdit}
                                                                        className="text-green-400 hover:text-green-300 p-2 hover:bg-green-900/30 rounded-lg transition-colors"
                                                                        title="Guardar"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                                        </svg>
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={cancelEditing}
                                                                        className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                                                        title="Cancelar"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); startEditing(m); }}
                                                                        className="text-slate-400 hover:text-purple-400 transition-colors p-2 hover:bg-purple-900/20 rounded-lg group"
                                                                        title="Editar"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                                                        </svg>
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteMetric(m.id); }}
                                                                        className="text-slate-600 hover:text-red-400 transition-colors p-2 hover:bg-red-900/20 rounded-lg group"
                                                                        title="Eliminar"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                                        </svg>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceView;
