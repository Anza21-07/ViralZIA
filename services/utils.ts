/// <reference lib="dom" />
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove data:mime/type;base64, prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const base64ToFile = async (dataUrl: string, filename: string, mimeType: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: mimeType });
};

export const pcmToWavBlob = (pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): Blob => {
    const headerSize = 44;
    const dataSize = pcmData.byteLength;
    const buffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // file size - 8
    writeString(8, 'WAVE');

    // "fmt " sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    const blockAlign = numChannels * (bitsPerSample / 8);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // "data" sub-chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    new Uint8Array(buffer).set(pcmData, headerSize);

    return new Blob([buffer], { type: 'audio/wav' });
};

export const normalizeWaveformData = (audioBuffer: AudioBuffer, samples: number): number[] => {
    const rawData = audioBuffer.getChannelData(0); // Get first channel
    const blockSize = Math.floor(rawData.length / samples); // Number of samples in each subdivision
    const filteredData = [];
    for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i; // the location of the first sample in the block
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
            sum = sum + Math.abs(rawData[blockStart + j]); // find the sum of all the samples in the block
        }
        filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
    }
    // Normalize to 0-1 range
    const multiplier = Math.pow(Math.max(...filteredData), -1);
    return filteredData.map(n => n * multiplier);
}

/**
 * Merges multiple Int16Arrays (raw PCM audio) into a single Int16Array.
 */
export const mergeInt16Arrays = (arrays: Int16Array[]): Int16Array => {
    const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
    const result = new Int16Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
};

/**
 * Creates a Blob from a string and triggers a download in the browser.
 * @param content The text content to download.
 * @param filename The desired name of the file.
 */
export const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Creates a Blob from a JSON object and triggers a download in the browser.
 * @param jsonData The JavaScript object to download.
 * @param filename The desired name of the file.
 */
export const downloadJsonFile = (jsonData: object, filename: string) => {
    const jsonString = JSON.stringify(jsonData, null, 2); // Pretty print JSON
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Converts a string to snake_case for filenames.
 * Example: "El Futuro Es Ahora" -> "el_futuro_es_ahora"
 */
export const toSnakeCase = (str: string): string => {
    return str
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w\-]+/g, ''); // Remove non-word chars
};

/**
 * Downloads a set of Base64 images as a ZIP file.
 * @param images Array of Base64 image strings (data URLs).
 * @param sessionTitle The title of the session for the filename.
 */
export const downloadImagesAsZip = async (images: string[], sessionTitle: string) => {
    const zip = new JSZip();
    const folderName = toSnakeCase(sessionTitle) || 'imagenes_viralzia';
    const folder = zip.folder(folderName);

    images.forEach((dataUrl, index) => {
        // Remove the "data:image/jpeg;base64," part
        const base64Data = dataUrl.split(',')[1];
        if (base64Data && folder) {
            folder.file(`${index + 1}.jpg`, base64Data, { base64: true });
        }
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Generates a CSV content string from an array of objects.
 * Supports Excel by adding a BOM.
 */
export const downloadCsv = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row => headers.map(fieldName => {
            let val = row[fieldName] ? row[fieldName].toString() : '';
            // Escape quotes
            if (val.includes(',')) {
                val = `"${val}"`;
            }
            return val;
        }).join(','))
    ].join('\n');

    // Add Byte Order Mark for Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Smart Export Pack Generator
 * Creates a structured ZIP file with scripts, organized audio, and visual assets.
 */
export const createSmartExportZip = async (
    title: string,
    scripts: any[],
    scriptAudioUrls: { [key: number]: string }, // blobUrls
    storyboardImages: { [scriptIndex: number]: { [promptIndex: number]: string } } // base64
) => {
    const zip = new JSZip();
    const safeTitle = toSnakeCase(title) || 'proyecto_viralzia';
    const root = zip.folder(safeTitle);
    
    if (!root) throw new Error("Could not create zip folder");

    // 1. Scripts Text File
    let scriptsText = `PROYECTO: ${title}\n\n`;
    scripts.forEach((s, i) => {
        scriptsText += `--- GUION ${i + 1}: ${s.title} ---\n\n`;
        s.script.forEach((scene: any) => {
            scriptsText += `ESCENA ${scene.scene}:\n`;
            scriptsText += `VISUAL: ${scene.visuals}\n`;
            scriptsText += `AUDIO: ${scene.voiceOver}\n\n`;
        });
        scriptsText += "\n================================\n\n";
    });
    root.file("00_Guiones_e_Instrucciones.txt", scriptsText);

    // 2. Process Assets for each Script
    for (let i = 0; i < scripts.length; i++) {
        const scriptFolder = root.folder(`01_Guion_${i + 1}`);
        if (!scriptFolder) continue;

        // Audio (Full VoiceOver)
        if (scriptAudioUrls[i]) {
            try {
                const response = await fetch(scriptAudioUrls[i]);
                const blob = await response.blob();
                scriptFolder.file("Audio_Completo_VoiceOver.wav", blob);
            } catch (e) {
                console.error("Error fetching audio blob", e);
            }
        }

        // Visual Assets (Storyboard)
        const images = storyboardImages[i];
        if (images) {
            const visualsFolder = scriptFolder.folder("Referencias_Visuales");
            if (visualsFolder) {
                Object.keys(images).forEach(key => {
                    const idx = parseInt(key);
                    const base64Data = images[idx].split(',')[1];
                    visualsFolder.file(`Escena_${idx + 1}.jpg`, base64Data, { base64: true });
                });
            }
        }
    }

    // Generate and Download
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}_SMART_PACK.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Generates a professional PDF Production Script (Claqueta de Rodaje).
 */
export const exportScriptToPdf = (script: any, brandName: string = "ViralZIA Creator") => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(script.title || "Guion de Video", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Creado por: ${brandName}`, 105, 28, { align: "center" });
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 105, 33, { align: "center" });

    // Table Columns
    const columns = [
        { header: "#", dataKey: "scene" },
        { header: "VISUAL (Imagen/Acción)", dataKey: "visuals" },
        { header: "AUDIO (Voz en Off)", dataKey: "voiceOver" },
        { header: "ESTIMADO", dataKey: "duration" },
    ];

    // Table Rows
    const rows = script.script.map((s: any) => ({
        scene: s.scene,
        visuals: s.visuals,
        voiceOver: s.voiceOver,
        duration: `${Math.ceil(s.voiceOver.trim().split(/\s+/).length / 2.5)}s`
    }));

    // Generate Table
    autoTable(doc, {
        startY: 40,
        head: [columns.map(c => c.header)],
        body: rows.map((r: any) => [r.scene, r.visuals, r.voiceOver, r.duration]),
        theme: 'grid',
        headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold' }, // Purple header
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // Scene #
            1: { cellWidth: 80 }, // Visual
            2: { cellWidth: 80 }, // Audio
            3: { cellWidth: 20, halign: 'center' } // Duration
        },
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
        didDrawPage: (data: any) => {
            // Footer
            const pageCount = (doc.internal as any).getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, 105, 290, { align: 'center' });
        }
    });

    doc.save(`${toSnakeCase(script.title || 'guion')}_produccion.pdf`);
}