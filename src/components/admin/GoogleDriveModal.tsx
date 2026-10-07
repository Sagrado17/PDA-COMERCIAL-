import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  UploadCloud, 
  FolderPlus, 
  Folder, 
  Check, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  LogOut, 
  RefreshCw, 
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { 
  signInWithGoogleDrive, 
  getDriveAccessToken, 
  getOrCreateFolder, 
  uploadImageToDrive, 
  listDriveImages, 
  makeFilePublic,
  DriveExistingFile,
  setDriveAccessToken
} from '../../services/googleDriveService';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImagesSelected: (imageUrls: string[]) => void;
  productId?: string; // Optional: if editing an existing product, auto-save to Firestore!
  productName?: string;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onImagesSelected,
  productId,
  productName
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(getDriveAccessToken());
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Folder state
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>('PDA Comercial - Fotos de Produtos');
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);

  // Active view: 'upload' or 'browse'
  const [activeTab, setActiveTab] = useState<'upload' | 'browse'>('upload');

  // Uploading state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Browse state
  const [existingImages, setExistingImages] = useState<DriveExistingFile[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [selectedDriveUrls, setSelectedDriveUrls] = useState<string[]>([]);

  // Feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingToFirestore, setIsSavingToFirestore] = useState(false);

  // Sync token from memory
  useEffect(() => {
    const current = getDriveAccessToken();
    if (current) {
      setAccessToken(current);
    }
  }, [isOpen]);

  // When authenticated, ensure folder is ready
  useEffect(() => {
    if (isOpen && accessToken) {
      initializeFolder(accessToken);
    }
  }, [isOpen, accessToken]);

  const initializeFolder = async (token: string) => {
    setIsLoadingFolder(true);
    setAuthError(null);
    try {
      const fId = await getOrCreateFolder(token, folderName);
      setFolderId(fId);
      loadExistingDriveImages(token, fId);
    } catch (err: any) {
      console.error('Erro ao inicializar pasta:', err);
      // If unauthorized, token might have expired
      if (err.message?.includes('401') || err.message?.includes('Invalid Credentials')) {
        setAccessToken(null);
        setDriveAccessToken(null);
        setAuthError('Sessão do Google expirada. Por favor, autentique-se novamente.');
      } else {
        setAuthError(err.message || 'Erro ao conectar com a pasta do Google Drive.');
      }
    } finally {
      setIsLoadingFolder(false);
    }
  };

  const loadExistingDriveImages = async (token: string, fId?: string) => {
    setIsLoadingImages(true);
    try {
      const images = await listDriveImages(token, fId || folderId || undefined);
      setExistingImages(images);
    } catch (err: any) {
      console.warn('Erro ao carregar fotos do Drive:', err);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogleDrive();
      setAccessToken(res.accessToken);
      setCurrentUser(res.user);
      await initializeFolder(res.accessToken);
    } catch (err: any) {
      console.error('Falha no login com Google:', err);
      setAuthError(err.message || 'Falha ao autenticar com o Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleUploadAndSave = async () => {
    if (!accessToken) return;
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress('Iniciando envio para o Google Drive...');
    const newlyUploaded: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(`Enviando ${i + 1} de ${selectedFiles.length}: "${file.name}"...`);
        
        const uploaded = await uploadImageToDrive(file, accessToken, folderId || undefined);
        newlyUploaded.push(uploaded.directUrl);
      }

      setUploadProgress('Finalizando permissões públicas...');
      setUploadedUrls(prev => [...prev, ...newlyUploaded]);
      setSelectedFiles([]);

      // Auto save to Firestore if editing an existing product
      if (productId) {
        setIsSavingToFirestore(true);
        try {
          const productRef = doc(db, 'products', productId);
          await updateDoc(productRef, {
            images: arrayUnion(...newlyUploaded)
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.UPDATE, `products/${productId}`);
        } finally {
          setIsSavingToFirestore(false);
        }
      }

      // Notify parent
      onImagesSelected(newlyUploaded);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);

      // Refresh drive list
      if (accessToken) {
        loadExistingDriveImages(accessToken, folderId || undefined);
      }
    } catch (err: any) {
      console.error('Erro durante o upload:', err);
      setAuthError(err.message || 'Erro durante o envio da imagem para o Google Drive.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleSelectFromDrive = async () => {
    if (selectedDriveUrls.length === 0) return;

    try {
      // Ensure selected files are public
      if (accessToken) {
        for (const file of existingImages.filter(img => selectedDriveUrls.includes(img.directUrl))) {
          await makeFilePublic(accessToken, file.id);
        }
      }

      // Auto save to Firestore if editing an existing product
      if (productId) {
        setIsSavingToFirestore(true);
        try {
          const productRef = doc(db, 'products', productId);
          await updateDoc(productRef, {
            images: arrayUnion(...selectedDriveUrls)
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.UPDATE, `products/${productId}`);
        } finally {
          setIsSavingToFirestore(false);
        }
      }

      onImagesSelected(selectedDriveUrls);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao associar imagens selecionadas.');
    }
  };

  const toggleSelectExisting = (url: string) => {
    setSelectedDriveUrls(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh] z-10"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-zinc-900 leading-tight">
                  Google Drive PDA Comercial
                </h3>
                <p className="text-xs text-zinc-500">
                  {productName ? `Adicionando fotos para: "${productName}"` : 'Gestão e envio de fotos para o Google Drive'}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* If NOT Authenticated: Show standard Sign In with Google */}
            {!accessToken ? (
              <div className="py-8 px-4 text-center max-w-md mx-auto space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
                  <UploadCloud className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-bold text-lg text-zinc-800">
                    Conectar ao seu Google Drive
                  </h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Para guardar fotos em alta resolução de forma rápida e segura, autentique-se com a sua conta Google. As imagens serão guardadas diretamente na pasta da PDA Comercial no seu Google Drive.
                  </p>
                </div>

                {authError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Official "Sign in with Google" button per Workspace Skill */}
                <div className="flex justify-center">
                  <button 
                    onClick={handleGoogleLogin}
                    disabled={isAuthenticating}
                    className="flex items-center justify-center gap-3 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold text-sm px-6 py-3.5 rounded-2xl border border-zinc-300 shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isAuthenticating ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                    )}
                    <span>{isAuthenticating ? 'Conectando ao Google...' : 'Entrar com o Google'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Authenticated View */
              <div className="space-y-6">
                {/* User & Folder Status */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="" className="w-9 h-9 rounded-full border border-zinc-300" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                        {currentUser?.email?.[0]?.toUpperCase() || 'G'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                        <span>{currentUser?.displayName || currentUser?.email || 'Conectado'}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Google Drive Ativo
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                        <Folder className="w-3.5 h-3.5 text-amber-500" />
                        <span>Pasta: <strong className="text-zinc-700">{folderName}</strong></span>
                        {isLoadingFolder && <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setAccessToken(null);
                      setDriveAccessToken(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Trocar conta</span>
                  </button>
                </div>

                {authError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Sub-tabs: Enviar / Selecionar */}
                <div className="flex border-b border-zinc-200">
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
                      activeTab === 'upload' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    Enviar do Computador / Celular
                  </button>
                  <button 
                    onClick={() => setActiveTab('browse')}
                    className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
                      activeTab === 'browse' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    Selecionar Fotos do Drive ({existingImages.length})
                  </button>
                </div>

                {/* TAB 1: UPLOAD */}
                {activeTab === 'upload' && (
                  <div className="space-y-4">
                    {/* Drop Zone */}
                    <div 
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-zinc-300 hover:border-blue-500 bg-zinc-50/60 hover:bg-blue-50/30 transition-all rounded-3xl p-8 text-center cursor-pointer space-y-3 group"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-zinc-200 flex items-center justify-center mx-auto text-zinc-400 group-hover:text-blue-600 transition-colors">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-700 group-hover:text-blue-700 transition-colors">
                          Clique aqui para selecionar fotos ou arraste os arquivos
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          PNG, JPG, WEBP, GIF (serão salvas diretamente no Google Drive)
                        </p>
                      </div>
                    </div>

                    {/* Selected files preview */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-600">
                          <span>{selectedFiles.length} foto(s) pronta(s) para envio:</span>
                          <button 
                            onClick={() => setSelectedFiles([])}
                            className="text-red-500 hover:underline"
                          >
                            Limpar
                          </button>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1">
                          {selectedFiles.map((f, idx) => (
                            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100 group">
                              <img 
                                src={URL.createObjectURL(f)} 
                                alt={f.name} 
                                className="w-full h-full object-cover" 
                              />
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {uploadProgress && (
                          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-xs flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>{uploadProgress}</span>
                          </div>
                        )}

                        <button 
                          onClick={handleUploadAndSave}
                          disabled={isUploading}
                          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Enviando para o Google Drive...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-4 h-4" />
                              <span>Salvar no Drive e Associar ao Produto</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: BROWSE EXISTING */}
                {activeTab === 'browse' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        Selecione imagens existentes na pasta da PDA Comercial:
                      </span>
                      <button 
                        onClick={() => accessToken && loadExistingDriveImages(accessToken, folderId || undefined)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Atualizar</span>
                      </button>
                    </div>

                    {isLoadingImages ? (
                      <div className="py-12 text-center text-zinc-400 space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                        <p className="text-xs">Carregando fotos do Google Drive...</p>
                      </div>
                    ) : existingImages.length === 0 ? (
                      <div className="py-12 text-center text-zinc-400 space-y-2 border border-dashed border-zinc-200 rounded-2xl">
                        <ImageIcon className="w-8 h-8 mx-auto text-zinc-300" />
                        <p className="text-xs font-semibold">Nenhuma foto encontrada nesta pasta ainda.</p>
                        <p className="text-[11px] text-zinc-400">Use a aba "Enviar" para enviar as primeiras fotos do produto!</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
                          {existingImages.map((img) => {
                            const isSelected = selectedDriveUrls.includes(img.directUrl);
                            return (
                              <div 
                                key={img.id}
                                onClick={() => toggleSelectExisting(img.directUrl)}
                                className={`relative aspect-square rounded-2xl overflow-hidden border cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'border-blue-600 ring-2 ring-blue-500/30' 
                                    : 'border-zinc-200 hover:border-zinc-400'
                                }`}
                              >
                                <img 
                                  src={img.thumbnailLink || img.directUrl} 
                                  alt={img.name} 
                                  className="w-full h-full object-cover" 
                                />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {selectedDriveUrls.length > 0 && (
                          <button 
                            onClick={handleSelectFromDrive}
                            disabled={isSavingToFirestore}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              Adicionar {selectedDriveUrls.length} Foto(s) Selecionada(s) ao Produto
                            </span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Success Banner */}
          {saveSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-2 text-center"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Fotos associadas com sucesso! Salvas no Google Drive e Firestore.</span>
            </motion.div>
          )}

          {/* Footer */}
          <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Google Drive API Ativa (PDA Comercial)
            </span>
            <button 
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 font-bold hover:bg-zinc-200 rounded-xl transition-colors"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default GoogleDriveModal;
