import React, { useState, useCallback, useEffect } from 'react';
import { EstimateForm } from './components/EstimateForm';
import { EstimatePreview } from './components/EstimatePreview';
import { EstimateData } from './types';
import { Download, CloudUpload, Printer, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
// import * as GeminiService from './services/geminiService';
import { downloadPDF, getPDFBlob } from './services/pdfService';
import { getAccessToken, uploadPDFToDrive, pickFolder, isDriveConfigured } from './services/googleDriveService';
import { Alert } from './components/ui/Alert';

const initialData: EstimateData = {
  layout: 'default',
  title: '견적서',
  estimateNumber: `INV-${new Date().getFullYear()}-458`,
  date: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  myInfo: {
    name: '견적서메이커',
    ceo: '홍길동',
    registrationNumber: '123-45-67890',
    address: '서울특별시 강남구 테헤란로 123, 4층',
    phone: '02-1234-5678',
    email: 'contact@quote-maker.com'
  },
  clientInfo: {
    name: '스타트업 주식회사',
    contactPerson: '김철수 팀장',
    email: 'ceo@startup-kr.com',
    address: '서울특별시 중구, 110022',
    phone: '010-1234-5678'
  },
  items: [
    { id: '1', name: '웹사이트 UI/UX 디자인', description: '메인 페이지 및 서브 페이지 5종 디자인 시안 작업', quantity: 1, price: 1500000 },
    { id: '2', name: '프론트엔드 개발 (React)', description: '반응형 웹 퍼블리싱 및 컴포넌트 개발', quantity: 1, price: 2000000 },
    { id: '3', name: '백엔드 API 연동', description: 'REST API 연동 및 데이터 바인딩', quantity: 1, price: 1000000 }
  ],
  notes: '본 견적서는 2주간 유효합니다.',
  notesTitle: '비고 (NOTES)',
  showNotes: true,
  terms: '착수금 50%, 잔금 50% (완료 후 7일 이내 지급)',
  termsTitle: '이용 약관 (TERMS & CONDITIONS)',
  showTerms: true,
  paymentInfo: {
    bank: '00은행',
    accountNumber: '1234-56-7890',
    holder: '홍길동'
  },
  taxRate: 0.1,
  currency: 'KRW',
  discount: 0,
  discountType: 'amount',
  logo: null,
  seal: null,
  tableStyle: {
    borderColor: '#e5e7eb', // gray-200
    headerBorderBottomWidth: 1,
    itemBorderBottomWidth: 1,
    rowPadding: 16, // Default padding (px)
  },
  styleConfig: {
    header: { fontSize: 36, color: '#0f172a' },
    supplier: { fontSize: 13, color: '#64748b' },
    client: { fontSize: 13, color: '#64748b' },
    tableHeader: { fontSize: 12, color: '#9ca3af' },
    tableItem: { fontSize: 14, color: '#0f172a' },
    total: { fontSize: 16, color: '#0f172a' },
    footer: { fontSize: 13, color: '#475569', showPageNumbers: true },
    payment: { fontSize: 13, color: '#475569', show: true },
    margins: { top: 15, bottom: 15, left: 15, right: 15 },
    useDefaultMargins: false,
    showMarginGuides: false,
    showSpacingGuides: false,
    spacing: {
        default: {
            logoToTitle: 24,
            titleToClient: 32,
            clientToTable: 32,
            tableToTotal: 24,
            totalToPayment: 24,
            paymentToNotes: 24,
            notesToTerms: 24,
            termsToSignature: 40
        },
        modern: {
            headerToInfo: 32,
            infoToTable: 32,
            tableToTotal: 24,
            totalToPayment: 24,
            paymentToNotes: 24,
            notesToTerms: 24,
            termsToSignature: 40
        },
        classic: {
            titleToInfo: 32,
            infoToTable: 32,
            tableToTotal: 24,
            totalToPayment: 24,
            paymentToNotes: 24,
            notesToTerms: 24,
            termsToSignature: 40
        },
        minimal: {
            titleToMeta: 32,
            metaToInfo: 32,
            infoToTable: 32,
            tableToTotal: 24,
            totalToPayment: 24,
            paymentToNotes: 24,
            notesToTerms: 24,
            termsToSignature: 40
        }
    },
    modernHeaderColor: '#0f172a',
    modernHeaderTextColor: '#ffffff'
  }
};

const STORAGE_KEY = 'smart-estimate-data-v1';

type Theme = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  // Load initial state from local storage or use default
  const [estimateData, setEstimateData] = useState<EstimateData>(() => {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            // Check if loaded data has the new spacing structure
            let mergedSpacing = initialData.styleConfig.spacing;
            
            // If the saved data has spacing, try to merge it
            if (parsed.styleConfig?.spacing) {
                // If it's the old format (missing 'default' key), discard it and use initial
                if ('default' in parsed.styleConfig.spacing) {
                    mergedSpacing = { ...initialData.styleConfig.spacing, ...parsed.styleConfig.spacing };
                }
            }

            return {
                ...initialData,
                ...parsed,
                styleConfig: { 
                    ...initialData.styleConfig, 
                    ...parsed.styleConfig,
                    spacing: mergedSpacing,
                    // Ensure new fields are populated if missing in storage
                    modernHeaderTextColor: parsed.styleConfig.modernHeaderTextColor || initialData.styleConfig.modernHeaderTextColor || '#ffffff'
                },
                tableStyle: { ...initialData.tableStyle, ...parsed.tableStyle },
                items: Array.isArray(parsed.items) ? parsed.items : initialData.items
            };
        }
    } catch (e) {
        console.error("Failed to load data from local storage", e);
    }
    return initialData;
  });

  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [theme, setTheme] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

  // Save to local storage whenever estimateData changes
  useEffect(() => {
    const timer = setTimeout(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(estimateData));
        } catch (e) {
            console.error("Failed to save data to local storage", e);
        }
    }, 500); // Debounce save
    return () => clearTimeout(timer);
  }, [estimateData]);

  // Theme Logic
  useEffect(() => {
    const checkSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const updateTheme = () => {
      if (theme === 'system') {
        setIsDark(checkSystemTheme());
      } else {
        setIsDark(theme === 'dark');
      }
    };

    updateTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') updateTheme();
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);
  
  // Alert State
  const [alertState, setAlertState] = useState<{
      show: boolean;
      variant: 'default' | 'destructive' | 'success';
      title: string;
      description?: string;
  }>({ show: false, variant: 'default', title: '' });

  const showAlert = (title: string, description?: string, variant: 'default' | 'destructive' | 'success' = 'default') => {
      setAlertState({ show: true, title, description, variant });
      // Auto hide after 5 seconds
      setTimeout(() => setAlertState(prev => ({ ...prev, show: false })), 5000);
  };

  const handleDataChange = useCallback((newData: EstimateData) => {
    setEstimateData(newData);
  }, []);

  // const handleGenerateNotes = async () => {
  //   setIsGeneratingNotes(true);
  //   const notes = await GeminiService.generateEstimateNotes(estimateData);
  //   setEstimateData(prev => ({ ...prev, notes }));
  //   setIsGeneratingNotes(false);
  // };

  const getFileName = () => {
    return `${estimateData.title}_${estimateData.estimateNumber}_${estimateData.date}`;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setTimeout(async () => {
        try {
            await downloadPDF('estimate-preview-container', getFileName());
            showAlert('다운로드 완료', 'PDF 파일이 성공적으로 다운로드되었습니다.', 'success');
        } catch (e) {
            showAlert('다운로드 실패', 'PDF 생성 중 오류가 발생했습니다.', 'destructive');
        } finally {
            setIsDownloading(false);
        }
    }, 100);
  };
  
  const handlePrint = () => {
      try {
          window.print();
      } catch (error: any) {
          console.error("Print failed:", error);
          showAlert('출력 실패', `브라우저 출력 기능을 실행하는 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}`, 'destructive');
      }
  };

  const handleSaveToDrive = async () => {
    if (!isDriveConfigured()) {
        showAlert('설정 필요', '구글 드라이브 연동을 위해 GOOGLE_CLIENT_ID 설정이 필요합니다.', 'destructive');
        return;
    }

    setIsUploading(true);
    try {
        const token = await getAccessToken();
        let targetFolderId = driveFolderId;

        if (!targetFolderId) {
            try {
                targetFolderId = await pickFolder(token);
                setDriveFolderId(targetFolderId);
            } catch (pickerError) {
                console.warn("Folder picking cancelled or failed", pickerError);
                // Confirm fallback or cancel
                showAlert('폴더 선택 취소', '폴더를 선택하지 않아 기본(루트) 폴더에 저장을 시도하거나, 다시 시도해주세요.', 'default');
                targetFolderId = undefined; 
            }
        }

        const blob = await getPDFBlob('estimate-preview-container');
        await uploadPDFToDrive(blob, getFileName(), token, targetFolderId || undefined);
        showAlert('저장 성공', '구글 드라이브에 파일이 저장되었습니다.', 'success');
    } catch (error: any) {
        console.error(error);
        const errorMessage = error?.message || '구글 드라이브 저장 중 오류가 발생했습니다.';
        showAlert('저장 실패', errorMessage, 'destructive');
    } finally {
        setIsUploading(false);
    }
  };

  // Scroll to form section logic
  const handleSectionClick = (sectionId: string) => {
    if (!isFormOpen) setIsFormOpen(true);
    
    // Allow UI to open before scrolling
    setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a temporary highlight effect
            element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
            setTimeout(() => {
                element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
            }, 1500);
        }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans relative">
      
      {/* Alert Container - Fixed at Top */}
      {alertState.show && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md no-print">
              <Alert 
                  variant={alertState.variant} 
                  title={alertState.title} 
                  description={alertState.description} 
                  onClose={() => setAlertState(prev => ({ ...prev, show: false }))}
              />
          </div>
      )}

      {/* Sidebar / Editor Area */}
      <div 
        className={`w-full md:w-[480px] lg:w-[520px] bg-white h-auto md:h-screen md:sticky md:top-0 z-10 flex flex-col border-r border-gray-200 shadow-xl no-print transition-all duration-300 ${!isFormOpen ? 'hidden' : ''} ${isDark ? 'dark' : ''}`}
      >
         <div className="flex-1 overflow-hidden flex flex-col">
            <EstimateForm 
                data={estimateData} 
                onChange={handleDataChange} 
                onGenerateNotes={handleGenerateNotes} 
                isGeneratingNotes={isGeneratingNotes}
                theme={theme}
                setTheme={setTheme}
            />
         </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-auto flex flex-col items-center justify-start bg-gray-100/50 print:p-0 print:overflow-visible print:bg-white">
        <div className="mb-6 w-full max-w-[210mm] flex justify-between items-center no-print">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="p-2 hover:bg-slate-200 rounded-md transition-colors text-slate-600 border border-transparent hover:border-slate-300"
                    title={isFormOpen ? "편집창 닫기" : "편집창 열기"}
                >
                    {isFormOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                </button>
                <h2 className="text-xl font-bold text-gray-800 tracking-tight">미리보기</h2>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2.5 rounded-md shadow-sm hover:bg-slate-50 transition font-medium text-sm"
                >
                    <Printer size={18} />
                    출력하기
                </button>
                <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-md shadow-sm hover:bg-slate-800 transition disabled:opacity-70 font-medium text-sm"
                >
                    {isDownloading ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> : <Download size={18} />}
                    PDF 다운로드
                </button>
            </div>
        </div>
        
        {/* Changed ID to target container, pages will be rendered inside */}
        <div id="estimate-preview-container" className="flex flex-col gap-8 items-center min-w-[210mm] print:block print:gap-0">
            <EstimatePreview 
                data={estimateData} 
                id="estimate-preview" 
                onSectionClick={handleSectionClick} 
            />
        </div>

        <div className="mt-8 text-gray-500 text-xs max-w-lg text-center no-print pb-10">
            <p>화면 상의 미리보기는 실제 PDF 출력 결과와 거의 동일합니다.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
