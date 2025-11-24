
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type, Modality } from '@google/genai';

// --- DEFINISI TIPE ---
enum AppStep {
  UNGGAH,
  SKENARIO,
  MEMBUAT_PROMPT,
  PROMPT_SIAP,
}

interface Scenario {
  title: string;
  description: string;
}

interface ImageData {
  base64: string;
  mimeType: string;
  name: string;
}

interface PromptWithImage {
  prompt: string;
  imageBase64: string;
}


// --- FUNGSI UTILITAS ---
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

// --- KOMPONEN BANTU & UI ---

const LoadingSpinner: React.FC = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const VideoIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-1.657-1.343-3-3-3H5c-1.657 0-3 1.343-3 3v10c0 1.657 1.343 3 3 3h9c1.657 0 3-1.343 3-3v-3.5l4 4v-11l-4 4z"></path></svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const RegenerateIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4c1.543-2.13 3.96-3.5 6.7-3.5 4.142 0 7.5 3.358 7.5 7.5 0 1.994-.78 3.818-2.074 5.161M20 20c-1.543 2.13-3.96 3.5-6.7 3.5-4.142 0-7.5-3.358-7.5-7.5 0-1.994.78-3.818 2.074-5.161" />
    </svg>
);

const PlayIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
  </svg>
);


const StepIndicator: React.FC<{ currentStep: AppStep }> = ({ currentStep }) => {
  const steps = [
    { id: AppStep.UNGGAH, name: 'Unggah Aset' },
    { id: AppStep.SKENARIO, name: 'Pilih Skenario' },
    { id: AppStep.MEMBUAT_PROMPT, name: 'Hasilkan Prompt' },
    { id: AppStep.PROMPT_SIAP, name: 'Salin Prompt' },
  ];

  const getStepStatus = (stepId: AppStep) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            {(() => {
              const status = getStepStatus(step.id);
              if (status === 'completed') {
                return (
                  <>
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="h-0.5 w-full bg-indigo-600" />
                    </div>
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-900">
                      <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </>
                );
              } else if (status === 'current') {
                return (
                  <>
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="h-0.5 w-full bg-gray-700" />
                    </div>
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-600 bg-gray-800">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" aria-hidden="true" />
                    </div>
                  </>
                );
              } else {
                return (
                  <>
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="h-0.5 w-full bg-gray-700" />
                    </div>
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-700 bg-gray-800">
                    </div>
                  </>
                );
              }
            })()}
          </li>
        ))}
      </ol>
    </nav>
  );
};

interface FileUploadProps {
  id: string;
  label: string;
  onFileUpload: (data: ImageData) => void;
  uploadedFile: ImageData | null;
}
const FileUpload: React.FC<FileUploadProps> = ({ id, label, onFileUpload, uploadedFile }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const base64 = await fileToBase64(file);
      onFileUpload({ base64, mimeType: file.type, name: file.name });
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      {uploadedFile ? (
        <div className="relative group p-2 border-2 border-dashed border-green-500 rounded-lg">
           <img src={`data:${uploadedFile.mimeType};base64,${uploadedFile.base64}`} alt={label} className="w-full h-48 object-contain rounded-md" />
           <p className="text-center text-sm mt-2 text-green-400 truncate">{uploadedFile.name}</p>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-indigo-500' : 'border-gray-600'} border-dashed rounded-md cursor-pointer`}
        >
          <div className="space-y-1 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex text-sm text-gray-400">
              <p className="pl-1">atau seret dan lepas</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG hingga 10MB</p>
          </div>
          <input id={id} name={id} type="file" className="sr-only" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e.target.files)} />
        </label>
      )}
    </div>
  );
};


// --- KOMPONEN APLIKASI UTAMA ---
export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UNGGAH);
  const [productImage, setProductImage] = useState<ImageData | null>(null);
  const [modelImage, setModelImage] = useState<ImageData | null>(null);
  const [productDescription, setProductDescription] = useState('');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [customScenario, setCustomScenario] = useState('');
  const [finalPrompts, setFinalPrompts] = useState<PromptWithImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [isRegenerating, setIsRegenerating] = useState<Record<number, boolean>>({});
  
  // State untuk Video Generation
  const [generatingVideos, setGeneratingVideos] = useState<Record<number, boolean>>({});
  const [videoUrls, setVideoUrls] = useState<Record<number, string>>({});


  const getAi = useCallback(() => {
    if (!process.env.API_KEY) {
        throw new Error("Kunci API tidak ditemukan. Pastikan variabel lingkungan API_KEY sudah diatur.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }, []);

  const handleApiKeyError = (err: any) => {
    console.error(err);
    let errorMessage = "Terjadi kesalahan tak terduga.";
    if (typeof err.message === 'string') {
        if (err.message.includes("API key not valid") || err.message.includes("Requested entity was not found")) {
            errorMessage = "Kunci API Anda tidak valid atau tidak memiliki akses. Pastikan Anda menggunakan API Key dari proyek berbayar.";
        } else {
           errorMessage = err.message;
        }
    }
    setError(errorMessage);
    setIsLoading(false);
  };
  
  const handleGenerateScenarios = useCallback(async () => {
    if (!productImage || !modelImage) return;
    setIsLoading(true);
    setLoadingMessage('Menghasilkan skenario kreatif...');
    setError(null);
    setScenarios([]);
    
    try {
      const ai = getAi();
      const imagePart = {
        inlineData: {
            mimeType: productImage.mimeType,
            data: productImage.base64,
        },
      };

      const textPrompt = `Anda adalah direktur kreatif untuk pemasaran media sosial. Analisis gambar produk yang disediakan. ${productDescription ? `Gunakan juga deskripsi produk ini: "${productDescription}".` : ''} Berdasarkan produk tersebut, hasilkan 5 skenario video pendek yang menarik (masing-masing 20-30 detik) untuk video pemasaran afiliasi. Video ini akan menampilkan seseorang ('model') dan produk ini. Tujuannya adalah untuk menyoroti manfaat produk dengan cara yang menarik secara visual. Kembalikan respons sebagai objek JSON.`;
      
      const textPart = { text: textPrompt };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    scenarios: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
      });

      const responseJson = JSON.parse(response.text);
      setScenarios(responseJson.scenarios);
      setCurrentStep(AppStep.SKENARIO);
    } catch (err) {
      handleApiKeyError(err);
    } finally {
      setIsLoading(false);
    }
  }, [productImage, modelImage, productDescription, getAi]);


  const handleGeneratePrompts = useCallback(async (scenario: Scenario | string) => {
    if (!productImage || !modelImage) return;

    const finalScenario = typeof scenario === 'string' ? { title: 'Skenario Kustom', description: scenario } : scenario;
    setCurrentStep(AppStep.MEMBUAT_PROMPT);
    setIsLoading(true);
    setError(null);
    setFinalPrompts([]);

    try {
      const ai = getAi();
      
      const modelImagePart = {
        inlineData: {
          mimeType: modelImage.mimeType,
          data: modelImage.base64,
        },
      };
      const productImagePart = {
        inlineData: {
          mimeType: productImage.mimeType,
          data: productImage.base64,
        },
      };
      const textPart = {
        text: `Penting: Gambar pertama yang disediakan adalah 'model' dan gambar kedua adalah 'produk'. Berdasarkan skenario ini: '${finalScenario.description}', pecah menjadi 4 prompt visual yang mendetail, adegan demi adegan, untuk AI generator video. Video ini dibintangi oleh karakter berdasarkan gambar referensi pertama (model) dan menampilkan produk dari gambar referensi kedua. Setiap prompt harus mendeskripsikan klip berdurasi 5-7 detik. Prompt-prompt tersebut harus mengalir bersama untuk menceritakan kisah dari skenario. Kembalikan hasilnya sebagai objek JSON.`
      };

      setLoadingMessage('Membuat alur cerita dari skenario Anda...');
      const promptGenResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [modelImagePart, productImagePart, textPart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    prompts: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
      });
      const { prompts: generatedPrompts } = JSON.parse(promptGenResponse.text);

      if (!generatedPrompts || generatedPrompts.length === 0) {
        throw new Error('Gagal menghasilkan prompt video.');
      }
      
      setLoadingMessage(`Membuat visualisasi untuk ${generatedPrompts.length} prompt... Ini mungkin memakan waktu.`);

      const imageGenerationPromises = generatedPrompts.map((prompt: string) => {
          const imageGenTextPart = {
            text: `PENTING: Gambar pertama adalah 'model', gambar kedua adalah 'produk'. Buat sebuah gambar fotorealistik berdasarkan prompt video berikut. Gambar harus menampilkan model dan produk yang sangat mirip dengan gambar referensi yang diberikan. Prompt: "${prompt}"`
          };
      
          return ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [modelImagePart, productImagePart, imageGenTextPart] },
            config: {
              responseModalities: [Modality.IMAGE],
            },
          }).then(response => {
              let imageBase64 = '';
              if (response.candidates?.[0]?.content?.parts) {
                  for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                      imageBase64 = part.inlineData.data;
                      break;
                    }
                  }
              }
              if (imageBase64) {
                return { prompt, imageBase64 };
              }
              console.warn(`Tidak dapat membuat gambar untuk prompt: ${prompt}`);
              return null;
          }).catch(err => {
              console.error(`Gagal membuat gambar untuk prompt "${prompt}":`, err);
              return null;
          });
      });
      
      const results = await Promise.all(imageGenerationPromises);
      const generatedPromptsWithImages = results.filter((result): result is PromptWithImage => result !== null);

      if (generatedPromptsWithImages.length === 0 && generatedPrompts.length > 0) {
          throw new Error('Gagal membuat visualisasi gambar untuk semua prompt.');
      }

      setFinalPrompts(generatedPromptsWithImages);
      setCurrentStep(AppStep.PROMPT_SIAP);

    } catch (err) {
      handleApiKeyError(err);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [productImage, modelImage, getAi]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopySuccess(id);
        setTimeout(() => setCopySuccess(''), 2000); // Reset after 2 seconds
    }, (err) => {
        console.error('Gagal menyalin teks: ', err);
    });
  };

  const handleCopyAll = () => {
    const allPrompts = finalPrompts.map(p => p.prompt).join('\n\n');
    handleCopy(allPrompts, 'all');
  };

  const handleDownloadImage = (base64: string, index: number) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = `affiliate_video_scene_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerateImage = useCallback(async (index: number) => {
    if (!productImage || !modelImage || !finalPrompts[index]) return;

    setIsRegenerating(prev => ({ ...prev, [index]: true }));
    setError(null);

    try {
        const ai = getAi();
        const promptToRegenerate = finalPrompts[index].prompt;

        const modelImagePart = { inlineData: { mimeType: modelImage.mimeType, data: modelImage.base64 } };
        const productImagePart = { inlineData: { mimeType: productImage.mimeType, data: productImage.base64 } };
        const imageGenTextPart = {
            text: `PENTING: Gambar pertama adalah 'model', gambar kedua adalah 'produk'. Buat sebuah gambar fotorealistik berdasarkan prompt video berikut. Gambar harus menampilkan model dan produk yang sangat mirip dengan gambar referensi yang diberikan. Prompt: "${promptToRegenerate}"`
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [modelImagePart, productImagePart, imageGenTextPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        let newImageBase64 = '';
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    newImageBase64 = part.inlineData.data;
                    break;
                }
            }
        }

        if (newImageBase64) {
            setFinalPrompts(currentPrompts => {
                const updatedPrompts = [...currentPrompts];
                updatedPrompts[index] = { ...updatedPrompts[index], imageBase64: newImageBase64 };
                return updatedPrompts;
            });
        } else {
            throw new Error(`Gagal membuat ulang gambar untuk prompt: ${promptToRegenerate}`);
        }
    } catch (err) {
        handleApiKeyError(err);
    } finally {
        setIsRegenerating(prev => ({ ...prev, [index]: false }));
    }
  }, [productImage, modelImage, finalPrompts, getAi]);


  const handleGenerateVideo = useCallback(async (index: number) => {
      const promptItem = finalPrompts[index];
      if (!promptItem) return;

      setGeneratingVideos(prev => ({ ...prev, [index]: true }));
      setError(null);

      try {
        // --- 1. API Key Selection for Veo ---
        // Penggunaan model Veo memerlukan kunci API dari proyek yang memiliki penagihan aktif.
        // Kita harus memastikan pengguna telah memilih kunci yang valid.
        const aiStudio = (window as any).aistudio;
        if (aiStudio) {
            const hasKey = await aiStudio.hasSelectedApiKey();
            if (!hasKey) {
                const success = await aiStudio.openSelectKey();
                if (!success) {
                    throw new Error("Kunci API diperlukan untuk menghasilkan video.");
                }
            }
        }

        // --- 2. Create AI Instance with Updated Key ---
        // Penting: Buat instance baru untuk menangkap API_KEY yang baru dipilih jika ada.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // --- 3. Start Video Generation ---
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: promptItem.prompt, // Prompt teks
            image: {
                imageBytes: promptItem.imageBase64, // Gambar referensi dari langkah sebelumnya
                mimeType: 'image/png', // Kita asumsikan PNG dari generateContent
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9', // Standar untuk video
            }
        });

        // --- 4. Polling Loop ---
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Tunggu 5 detik
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        // --- 5. Fetch and Store Video ---
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            // Kita harus menyertakan API KEY saat fetch dari link ini
            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!videoResponse.ok) throw new Error("Gagal mengunduh video yang dihasilkan.");
            
            const videoBlob = await videoResponse.blob();
            const videoUrl = URL.createObjectURL(videoBlob);
            
            setVideoUrls(prev => ({ ...prev, [index]: videoUrl }));
        } else {
             throw new Error("Operasi selesai tetapi tidak ada video yang dikembalikan.");
        }

      } catch (err) {
          handleApiKeyError(err);
      } finally {
          setGeneratingVideos(prev => ({ ...prev, [index]: false }));
      }
  }, [finalPrompts]);


  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="text-center p-8 flex flex-col items-center justify-center">
                <LoadingSpinner />
                <h2 className="mt-4 text-xl font-semibold">{loadingMessage}</h2>
                <p className="mt-2 text-gray-400">Keajaiban AI sedang terjadi. Mohon jangan tutup jendela ini.</p>
            </div>
        );
    }

    switch (currentStep) {
      case AppStep.UNGGAH:
        return (
          <>
            <h2 className="text-2xl font-bold text-center mb-1">Unggah Aset Anda</h2>
            <p className="text-gray-400 text-center mb-8">Sediakan gambar produk dan model Anda.</p>
            <div className="flex flex-col md:flex-row gap-8">
              <FileUpload id="product" label="Gambar Produk" onFileUpload={setProductImage} uploadedFile={productImage}/>
              <FileUpload id="model" label="Gambar Model" onFileUpload={setModelImage} uploadedFile={modelImage}/>
            </div>
             <div className="mt-6">
                <label htmlFor="product-description" className="block text-sm font-medium text-gray-300 mb-2">Deskripsi Produk (Opsional)</label>
                <textarea
                    id="product-description"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
                    placeholder="Contoh: Sepatu lari ringan dengan bantalan busa responsif, cocok untuk lari jarak jauh..."
                />
            </div>
            {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
            <button
              onClick={handleGenerateScenarios}
              disabled={!productImage || !modelImage || isLoading}
              className="mt-8 w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLoading ? <LoadingSpinner /> : 'Hasilkan Skenario'}
            </button>
          </>
        );
      case AppStep.SKENARIO:
        return (
          <>
            <h2 className="text-2xl font-bold text-center mb-1">Pilih Skenario</h2>
            <p className="text-gray-400 text-center mb-8">Pilih salah satu skenario buatan AI atau tulis sendiri.</p>
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              {scenarios.map((scenario, index) => (
                <div key={index} onClick={() => handleGeneratePrompts(scenario)} className="p-4 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-800 hover:border-indigo-500 transition-colors">
                  <h3 className="font-semibold text-indigo-400">{scenario.title}</h3>
                  <p className="text-sm text-gray-300 mt-1">{scenario.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-6">
                <h3 className="font-semibold mb-2">Atau tulis skenario khusus:</h3>
                <textarea
                    value={customScenario}
                    onChange={(e) => setCustomScenario(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
                    placeholder="Contoh: Video serba cepat yang menunjukkan model membuka kotak produk dan bereaksi dengan gembira..."
                />
                <button
                    onClick={() => handleGeneratePrompts(customScenario)}
                    disabled={!customScenario.trim()}
                    className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    Gunakan Skenario Khusus
                </button>
            </div>
          </>
        );
      case AppStep.PROMPT_SIAP:
        return (
          <>
            <h2 className="text-2xl font-bold text-center mb-1">Prompt Video Anda Siap!</h2>
            <p className="text-gray-400 text-center mb-8">Salin prompt di bawah atau langsung buat video menggunakan Veo.</p>
            {error && <p className="mb-4 text-sm text-red-400 text-center bg-red-900/20 p-2 rounded border border-red-800">{error}</p>}
            <div className="space-y-8 max-h-[60vh] overflow-y-auto p-1 pr-2">
              {finalPrompts.map((item, index) => (
                <div key={index} className="bg-gray-900/50 p-4 rounded-lg flex flex-col gap-4 border border-gray-700">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="relative w-full sm:w-48 flex-shrink-0">
                        <img 
                          src={`data:image/png;base64,${item.imageBase64}`}
                          alt={`Visualisasi untuk prompt ${index + 1}`}
                          className={`w-full h-auto rounded-md object-cover transition-opacity duration-300 ${isRegenerating[index] ? 'opacity-20' : 'opacity-100'}`}
                        />
                        {isRegenerating[index] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
                                <LoadingSpinner />
                            </div>
                        )}
                        <span className="absolute top-1 left-1 bg-black/70 text-xs px-2 py-0.5 rounded text-white">Scene {index + 1}</span>
                      </div>
                      <div className="flex-1 flex flex-col justify-between self-stretch">
                        <p className="text-sm text-gray-300 flex-grow mb-3">{item.prompt}</p>
                        
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={() => handleDownloadImage(item.imageBase64, index)}
                                title="Unduh Gambar"
                                className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
                                disabled={isRegenerating[index] || generatingVideos[index]}
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => handleRegenerateImage(index)}
                                title="Buat Ulang Gambar"
                                className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
                                disabled={isRegenerating[index] || generatingVideos[index]}
                            >
                                <RegenerateIcon className={`w-5 h-5 ${isRegenerating[index] ? 'animate-spin' : ''}`} />
                            </button>
                            <button 
                                onClick={() => handleCopy(item.prompt, `prompt-${index}`)} 
                                className="text-sm bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-3 rounded transition-all"
                                disabled={isRegenerating[index]}
                            >
                              {copySuccess === `prompt-${index}` ? 'Disalin!' : 'Salin Teks'}
                            </button>
                            
                            <div className="flex-grow"></div>

                             <button 
                                onClick={() => handleGenerateVideo(index)} 
                                className={`flex items-center gap-2 text-sm text-white font-bold py-2 px-4 rounded transition-all ${
                                    generatingVideos[index] 
                                    ? 'bg-indigo-800 cursor-not-allowed' 
                                    : 'bg-indigo-600 hover:bg-indigo-500'
                                }`}
                                disabled={isRegenerating[index] || generatingVideos[index]}
                            >
                              {generatingVideos[index] ? (
                                <>
                                  <LoadingSpinner />
                                  <span>Membuat Video...</span>
                                </>
                              ) : (
                                <>
                                  <PlayIcon className="w-5 h-5" />
                                  <span>Buat Video (Veo)</span>
                                </>
                              )}
                            </button>
                        </div>
                      </div>
                  </div>
                  
                  {/* Video Player Area */}
                  {videoUrls[index] && (
                      <div className="mt-2 w-full bg-black rounded-lg overflow-hidden border border-indigo-900/50">
                          <p className="text-xs text-gray-400 p-2 bg-gray-800/50 border-b border-gray-700">Hasil Video Veo:</p>
                          <video 
                              controls 
                              className="w-full h-auto max-h-[400px]" 
                              src={videoUrls[index]} 
                              poster={`data:image/png;base64,${item.imageBase64}`}
                          >
                              Browser Anda tidak mendukung tag video.
                          </video>
                      </div>
                  )}
                </div>
              ))}
            </div>
             <button
              onClick={handleCopyAll}
              className="mt-8 w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {copySuccess === 'all' ? 'Semua Prompt Disalin!' : 'Salin Semua Prompt'}
            </button>
             <p className="mt-4 text-xs text-gray-500 text-center">
                Catatan: Pembuatan video menggunakan Veo membutuhkan waktu beberapa menit dan memerlukan API Key proyek berbayar.
            </p>
          </>
        )
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
            <div className="flex items-center justify-center gap-3">
                <VideoIcon className="w-10 h-10 text-indigo-400"/>
                <h1 className="text-4xl font-bold tracking-tight">Generator Video Afiliasi AI</h1>
            </div>
            <p className="mt-2 text-lg text-gray-400">Buat video produk yang menarik dalam hitungan menit.</p>
        </header>
        
        <div className="mb-12 flex justify-center">
          <StepIndicator currentStep={currentStep}/>
        </div>

        <main className="bg-gray-800/50 rounded-xl shadow-2xl p-6 sm:p-10 border border-gray-700 min-h-[300px] flex flex-col justify-center">
            {renderContent()}
        </main>

        <footer className="text-center mt-8 text-sm text-gray-500">
            <p>Didukung oleh Google Gemini & Veo</p>
        </footer>
      </div>
    </div>
  );
}
