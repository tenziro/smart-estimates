import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Wand2, RefreshCw, Upload, Image as ImageIcon, Settings, Type, Stamp, User, Briefcase, Calendar as CalendarIcon, FileText, Palette, Layout, GripVertical, ChevronLeft, ChevronRight, Grid, Move, Eye, Sun, Moon, Monitor, ArrowUpDown } from 'lucide-react';
import { EstimateData, LineItem, StyleConfig, EstimateLayout } from '../types';
// import * as GeminiService from '../services/geminiService';
import { format, addMonths, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shadcn-like Components
const Label = ({ className = '', ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-slate-200 ${className}`} {...props} />
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={`flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus-visible:ring-slate-300 ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={`flex min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus-visible:ring-slate-300 ${className}`}
    {...props}
  />
));
Textarea.displayName = "Textarea";

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary', size?: 'default' | 'sm' | 'lg' | 'icon' }>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const variants = {
    default: "bg-slate-900 text-slate-50 hover:bg-slate-900/90 shadow dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90",
    destructive: "bg-red-50 text-slate-50 hover:bg-red-500/90 shadow-sm dark:bg-red-900/50 dark:text-red-100 dark:hover:bg-red-900/70",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80 shadow-sm dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80",
    ghost: "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50",
  };
  
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };
  
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
});
Button.displayName = "Button";

const Switch = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }>(
  ({ className, checked, onCheckedChange, ...props }, ref) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      disabled={props.disabled}
      ref={ref}
      onClick={(e) => {
          e.preventDefault();
          onCheckedChange?.(!checked);
      }}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-slate-900 data-[state=unchecked]:bg-slate-200 dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950 dark:data-[state=checked]:bg-slate-50 dark:data-[state=unchecked]:bg-slate-700",
        className
      )}
      {...props}
    >
      <span
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 dark:bg-slate-950"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";

// Helper for inputs
const formatNumber = (value: number | string) => {
    if (value === 0) return '0';
    if (!value) return '';
    const num = typeof value === 'string' ? parseInt(value.replace(/,/g, ''), 10) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('ko-KR');
};

// Custom Calendar Component
const DatePicker = ({ value, onChange, label }: { value: string, onChange: (date: string) => void, label: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(value || new Date()));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
      if(value) {
          setCurrentMonth(new Date(value));
      }
  }, [value]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));

  const onDateClick = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const daysInMonth = eachDayOfInterval({
    start: startDate,
    end: endOfWeek(endOfMonth(currentMonth))
  });

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <Label>{label}</Label>
      <Button
        variant="outline"
        className={cn("w-full justify-start text-left font-normal h-9 bg-white dark:bg-slate-950 dark:text-slate-50", !value && "text-slate-500 dark:text-slate-400")}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? format(new Date(value), "PPP", { locale: ko }) : <span>날짜 선택</span>}
      </Button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 rounded-md border border-slate-200 bg-white p-3 shadow-md w-[280px] dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
             <button onClick={prevMonth} className="h-7 w-7 bg-transparent p-0 hover:opacity-100 opacity-50 hover:bg-slate-100 rounded-md flex items-center justify-center dark:text-slate-100 dark:hover:bg-slate-800">
                <ChevronLeft className="h-4 w-4" />
             </button>
             <div className="text-sm font-medium dark:text-slate-100">
                {format(currentMonth, "yyyy년 MM월")}
             </div>
             <button onClick={nextMonth} className="h-7 w-7 bg-transparent p-0 hover:opacity-100 opacity-50 hover:bg-slate-100 rounded-md flex items-center justify-center dark:text-slate-100 dark:hover:bg-slate-800">
                <ChevronRight className="h-4 w-4" />
             </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
             {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                 <div key={d} className="text-slate-500 font-normal dark:text-slate-400">{d}</div>
             ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-sm">
             {daysInMonth.map((day, idx) => (
                <button
                   key={idx}
                   onClick={() => onDateClick(day)}
                   className={cn(
                       "h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-md flex items-center justify-center hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800 dark:text-slate-100",
                       !isSameMonth(day, currentMonth) && "text-slate-300 opacity-50 dark:text-slate-600",
                       isSameDay(day, new Date(value)) && "bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50 focus:bg-slate-900 focus:text-slate-50 font-medium dark:bg-slate-100 dark:text-slate-900",
                       isToday(day) && !isSameDay(day, new Date(value)) && "text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-slate-50"
                   )}
                >
                    {format(day, 'd')}
                </button>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Card = ({ children, className = '', ...props }: { children?: React.ReactNode, className?: string, id?: string }) => (
  <div className={`rounded-xl border border-slate-200 bg-white text-slate-950 shadow dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 ${className}`} {...props}>
    {children}
  </div>
);

const CardContent = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

// Section Header Component for grouping
const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 text-slate-800 mb-4 pb-2 border-b border-slate-100 dark:text-slate-100 dark:border-slate-800">
        <Icon size={18} className="text-slate-500 dark:text-slate-400" />
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
    </div>
);


interface EstimateFormProps {
  data: EstimateData;
  onChange: (data: EstimateData) => void;
  onGenerateNotes: () => void;
  isGeneratingNotes: boolean;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const EstimateForm: React.FC<EstimateFormProps> = ({ 
  data, 
  onChange, 
  onGenerateNotes, 
  isGeneratingNotes,
  theme,
  setTheme
}) => {

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  
  // Drag and Drop State
  const [dragItemIndex, setDragItemIndex] = useState<number | null>(null);
  const [hoveredHandleId, setHoveredHandleId] = useState<string | null>(null);

  const subtotal = data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // Removed layout restriction for border settings to allow spacing controls for all layouts
  const isBorderSettingsEnabled = true;

  const updateField = <K extends keyof EstimateData>(key: K, value: EstimateData[K]) => {
    onChange({ ...data, [key]: value });
  };

  const updateNestedField = (section: 'myInfo' | 'clientInfo' | 'paymentInfo' | 'tableStyle', key: string, value: any) => {
    // @ts-ignore
    onChange({
      ...data,
      [section]: {
        ...data[section],
        [key]: value
      }
    });
  };

  const updateStyleConfig = (key: keyof StyleConfig, subKey: string, value: any) => {
    const section = data.styleConfig[key];
    if (typeof section !== 'object' || section === null) return;

    onChange({
      ...data,
      styleConfig: {
        ...data.styleConfig,
        [key]: {
          ...section,
          [subKey]: value
        }
      }
    });
  };
  
  // New helper for updating granular spacing specific to current layout
  const updateSpacing = (key: string, value: number) => {
      const currentLayout = data.layout;
      onChange({
          ...data,
          styleConfig: {
              ...data.styleConfig,
              spacing: {
                  ...data.styleConfig.spacing,
                  [currentLayout]: {
                      ...data.styleConfig.spacing[currentLayout],
                      [key]: value
                  }
              }
          }
      });
  };

  const handleUseDefaultMargins = (checked: boolean) => {
      if (checked) {
          onChange({
              ...data,
              styleConfig: {
                  ...data.styleConfig,
                  useDefaultMargins: true,
                  margins: { top: 15, bottom: 15, left: 15, right: 15 }
              }
          });
      } else {
          onChange({
              ...data,
              styleConfig: {
                  ...data.styleConfig,
                  useDefaultMargins: false
              }
          });
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        alert('JPG 또는 PNG 파일만 업로드 가능합니다.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        alert('JPG 또는 PNG 파일만 업로드 가능합니다.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('seal', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      name: '',
      description: '',
      quantity: 1,
      price: 0
    };
    updateField('items', [...data.items, newItem]);
  };

  const removeItem = (id: string) => {
    updateField('items', data.items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    const newItems = data.items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    updateField('items', newItems);
  };

  const handleAiDescription = async (id: string, name: string) => {
    if (!name) return;
    setLoadingItemId(id);
    {/* const desc = await GeminiService.enhanceItemDescription(name);
    if (desc) {
      updateItem(id, 'description', desc);
    } */}
    setLoadingItemId(null);
  };

  // DnD Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (index: number) => {
    if (dragItemIndex === null) return;
    if (dragItemIndex === index) return;

    const newItems = [...data.items];
    const item = newItems[dragItemIndex];
    newItems.splice(dragItemIndex, 1);
    newItems.splice(index, 0, item);

    updateField('items', newItems);
    setDragItemIndex(index);
  };

  const handleDragEnd = () => {
    setDragItemIndex(null);
  };

  // Concise StyleRow for Font Settings
  const StyleRow = ({ label, sectionKey }: { label: string, sectionKey: keyof StyleConfig }) => {
    const style = data.styleConfig[sectionKey] as any;
    return (
      <div className="flex items-center justify-between py-1.5 border-b last:border-0 border-slate-100 gap-4 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap dark:text-slate-400">{label}</span>
          <div className="flex items-center gap-2 shrink-0">
               {/* Font Size Input - Concise */}
              <div className="relative w-20 flex items-center">
                   <Input 
                        type="number"
                        className="h-9 text-sm pr-8"
                        value={style.fontSize}
                        onChange={(e) => updateStyleConfig(sectionKey, 'fontSize', parseInt(e.target.value) || 0)}
                   />
                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">px</span>
              </div>
              
              {/* Color Picker - Concise (Circle only) */}
              <div className="relative w-6 h-6 rounded-full border border-slate-200 overflow-hidden shadow-sm shrink-0 hover:ring-2 hover:ring-slate-100 transition-all cursor-pointer dark:border-slate-700 dark:hover:ring-slate-700">
                   <input 
                      type="color" 
                      value={style.color}
                      onChange={(e) => updateStyleConfig(sectionKey, 'color', e.target.value)}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                      title="색상 변경"
                  />
              </div>
          </div>
      </div>
  )};

  // Configuration for spacing inputs based on layout
  const SPACING_CONFIG: Record<EstimateLayout, { key: string; label: string }[]> = {
      default: [
          { key: 'logoToTitle', label: '로고 - 문서 제목' },
          { key: 'titleToClient', label: '문서 제목 - 고객 정보' },
          { key: 'clientToTable', label: '고객 정보 - 견적 테이블' },
          { key: 'tableToTotal', label: '견적 테이블 - 총계' },
          { key: 'totalToPayment', label: '총계 - 계좌 정보' },
          { key: 'paymentToNotes', label: '계좌 정보 - 비고' },
          { key: 'notesToTerms', label: '비고 - 이용약관' },
          { key: 'termsToSignature', label: '이용약관 - 공급자(서명)' },
      ],
      modern: [
          { key: 'headerToInfo', label: '헤더 - 정보 영역' },
          { key: 'infoToTable', label: '정보 영역 - 견적 테이블' },
          { key: 'tableToTotal', label: '견적 테이블 - 총계' },
          { key: 'totalToPayment', label: '총계 - 계좌 정보' },
          { key: 'paymentToNotes', label: '계좌 정보 - 비고' },
          { key: 'notesToTerms', label: '비고 - 이용약관' },
          { key: 'termsToSignature', label: '이용약관 - 공급자(서명)' },
      ],
      classic: [
          { key: 'titleToInfo', label: '문서 제목 - 정보 영역' },
          { key: 'infoToTable', label: '정보 영역 - 견적 테이블' },
          { key: 'tableToTotal', label: '견적 테이블 - 총계' },
          { key: 'totalToPayment', label: '총계 - 계좌 정보' },
          { key: 'paymentToNotes', label: '계좌 정보 - 비고' },
          { key: 'notesToTerms', label: '비고 - 이용약관' },
          { key: 'termsToSignature', label: '이용약관 - 공급자(서명)' },
      ],
      minimal: [
          { key: 'titleToMeta', label: '문서 제목 - 메타 정보' },
          { key: 'metaToInfo', label: '메타 정보 - 고객/공급자' },
          { key: 'infoToTable', label: '고객/공급자 - 견적 테이블' },
          { key: 'tableToTotal', label: '견적 테이블 - 총계' },
          { key: 'totalToPayment', label: '총계 - 계좌 정보' },
          { key: 'paymentToNotes', label: '계좌 정보 - 비고' },
          { key: 'notesToTerms', label: '비고 - 이용약관' },
          { key: 'termsToSignature', label: '이용약관 - 공급자(서명)' },
      ]
  };

  return (
    <div className="bg-slate-50/50 p-4 space-y-6 overflow-y-auto h-full pb-20 dark:bg-slate-900">
      
      <div className="flex items-center justify-between mb-2 px-2">
         <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">견적서 작성</h2>
         <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
             <button
                onClick={() => setTheme('light')}
                className={cn(
                    "p-1.5 rounded-md transition-all",
                    theme === 'light' ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="라이트 모드"
             >
                 <Sun size={14} />
             </button>
             <button
                onClick={() => setTheme('dark')}
                className={cn(
                    "p-1.5 rounded-md transition-all",
                    theme === 'dark' ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="다크 모드"
             >
                 <Moon size={14} />
             </button>
             <button
                onClick={() => setTheme('system')}
                className={cn(
                    "p-1.5 rounded-md transition-all",
                    theme === 'system' ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="시스템 설정"
             >
                 <Monitor size={14} />
             </button>
         </div>
      </div>

      {/* 1. Design & Style Configuration */}
      <Card id="form-section-design">
        <CardContent className="pt-6">
            <SectionHeader icon={Palette} title="디자인 및 스타일 설정" />
            
            <div className="space-y-6">
                {/* Layout Selector */}
                <div className="space-y-2">
                   <div className="flex items-center gap-2 mb-2">
                        <Grid size={14} className="text-slate-400" />
                        <Label>레이아웃 선택</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => updateField('layout', 'default')}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800",
                                data.layout === 'default' 
                                    ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800" 
                                    : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
                            )}
                         >
                             <div className="w-8 h-10 border border-slate-300 rounded-sm mb-2 bg-white flex flex-col p-[2px] gap-[2px]">
                                 <div className="w-full h-2 bg-slate-200 rounded-[1px]"></div>
                                 <div className="w-full h-1 bg-slate-100 rounded-[1px]"></div>
                                 <div className="w-full h-4 border border-dashed border-slate-200 rounded-[1px]"></div>
                             </div>
                             <span className="text-xs font-medium dark:text-slate-300">Default</span>
                         </button>

                         <button 
                            onClick={() => updateField('layout', 'modern')}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800",
                                data.layout === 'modern' 
                                    ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800" 
                                    : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
                            )}
                         >
                             <div className="w-8 h-10 border border-slate-300 rounded-sm mb-2 bg-white flex flex-col">
                                 <div className="w-full h-3 bg-slate-800 rounded-t-sm"></div>
                                 <div className="flex-1 p-[2px] flex flex-col gap-[2px]">
                                     <div className="flex gap-[2px]">
                                         <div className="w-1/2 h-4 bg-slate-100 rounded-[1px]"></div>
                                         <div className="w-1/2 h-4 bg-slate-100 rounded-[1px]"></div>
                                     </div>
                                 </div>
                             </div>
                             <span className="text-xs font-medium dark:text-slate-300">Modern</span>
                         </button>

                         <button 
                            onClick={() => updateField('layout', 'classic')}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800",
                                data.layout === 'classic' 
                                    ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800" 
                                    : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
                            )}
                         >
                             <div className="w-8 h-10 border-2 border-slate-400 rounded-sm mb-2 bg-white flex flex-col p-[2px]">
                                 <div className="w-full h-full border border-slate-200 grid grid-rows-4">
                                     <div className="row-span-1 border-b border-slate-200 bg-slate-50"></div>
                                     <div className="row-span-3"></div>
                                 </div>
                             </div>
                             <span className="text-xs font-medium dark:text-slate-300">Classic</span>
                         </button>

                         <button 
                            onClick={() => updateField('layout', 'minimal')}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800",
                                data.layout === 'minimal' 
                                    ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800" 
                                    : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
                            )}
                         >
                             <div className="w-8 h-10 border border-slate-300 rounded-sm mb-2 bg-white flex flex-col p-[3px] gap-[3px]">
                                 <div className="w-1/2 h-2 bg-slate-800 rounded-[1px]"></div>
                                 <div className="w-full h-[1px] bg-slate-200"></div>
                                 <div className="w-full h-full"></div>
                             </div>
                             <span className="text-xs font-medium dark:text-slate-300">Minimal</span>
                         </button>
                    </div>
                </div>
                
                 {/* Margins */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Move size={14} className="text-slate-400" />
                            <Label>문서 여백 (mm)</Label>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-4 dark:bg-slate-900/50 dark:border-slate-800">
                        <div className="flex flex-col gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                             <div className="flex items-center justify-between">
                                <Label className="text-xs text-slate-500 font-normal dark:text-slate-400">기본값(15mm) 사용</Label>
                                <Switch 
                                    checked={data.styleConfig.useDefaultMargins}
                                    onCheckedChange={handleUseDefaultMargins}
                                    className="scale-90"
                                />
                             </div>
                             <div className="flex items-center justify-between">
                                <Label className="text-xs text-slate-500 font-normal flex items-center gap-1 dark:text-slate-400">
                                    <Eye size={10} />
                                    여백 영역 미리보기
                                </Label>
                                <Switch 
                                    checked={data.styleConfig.showMarginGuides}
                                    onCheckedChange={(checked) => onChange({
                                        ...data,
                                        styleConfig: { ...data.styleConfig, showMarginGuides: checked }
                                    })}
                                    className="scale-90"
                                />
                             </div>
                        </div>

                        <div className={cn("grid grid-cols-2 gap-4 transition-opacity", data.styleConfig.useDefaultMargins && "opacity-50 pointer-events-none")}>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-slate-500 font-normal dark:text-slate-400">상단 (Top)</Label>
                                <div className="relative w-20 flex items-center">
                                    <Input 
                                        type="number"
                                        min="5" max="100"
                                        value={data.styleConfig.margins.top}
                                        onChange={(e) => updateStyleConfig('margins', 'top', parseInt(e.target.value) || 0)}
                                        className="h-9 text-sm pr-8"
                                        disabled={data.styleConfig.useDefaultMargins}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">mm</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-slate-500 font-normal dark:text-slate-400">하단 (Bottom)</Label>
                                <div className="relative w-20 flex items-center">
                                    <Input 
                                        type="number"
                                        min="5" max="100"
                                        value={data.styleConfig.margins.bottom}
                                        onChange={(e) => updateStyleConfig('margins', 'bottom', parseInt(e.target.value) || 0)}
                                        className="h-9 text-sm pr-8"
                                        disabled={data.styleConfig.useDefaultMargins}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">mm</span>
                                </div>
                            </div>
                             <div className="flex items-center justify-between">
                                <Label className="text-xs text-slate-500 font-normal dark:text-slate-400">좌측 (Left)</Label>
                                <div className="relative w-20 flex items-center">
                                    <Input 
                                        type="number"
                                        min="5" max="100"
                                        value={data.styleConfig.margins.left}
                                        onChange={(e) => updateStyleConfig('margins', 'left', parseInt(e.target.value) || 0)}
                                        className="h-9 text-sm pr-8"
                                        disabled={data.styleConfig.useDefaultMargins}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">mm</span>
                                </div>
                            </div>
                             <div className="flex items-center justify-between">
                                <Label className="text-xs text-slate-500 font-normal dark:text-slate-400">우측 (Right)</Label>
                                <div className="relative w-20 flex items-center">
                                    <Input 
                                        type="number"
                                        min="5" max="100"
                                        value={data.styleConfig.margins.right}
                                        onChange={(e) => updateStyleConfig('margins', 'right', parseInt(e.target.value) || 0)}
                                        className="h-9 text-sm pr-8"
                                        disabled={data.styleConfig.useDefaultMargins}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">mm</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


{/* Spacing Settings (Dedicated Section) */}
                <div className="space-y-2" id="form-section-spacing">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpDown size={14} className="text-slate-400" />
                        <Label>간격 및 여백 설정 ({data.layout.charAt(0).toUpperCase() + data.layout.slice(1)} Layout)</Label>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                        {/* Spacing Guide Toggle */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <Label className="text-xs text-slate-500 font-normal flex items-center gap-1 dark:text-slate-400">
                                <Eye size={10} />
                                간격 가이드 보기
                            </Label>
                            <Switch 
                                checked={data.styleConfig.showSpacingGuides}
                                onCheckedChange={(checked) => onChange({
                                    ...data,
                                    styleConfig: { ...data.styleConfig, showSpacingGuides: checked }
                                })}
                                className="scale-90"
                            />
                        </div>

                        {/* Row Padding */}
                        <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-xs font-medium text-slate-600 whitespace-nowrap dark:text-slate-400">항목 간격 (상하 여백)</span>
                              <div className="flex items-center gap-2 shrink-0">
                                  <div className="relative w-20 flex items-center">
                                       <Input 
                                            type="number"
                                            className="h-9 text-sm pr-8"
                                            value={data.tableStyle.rowPadding}
                                            onChange={(e) => updateNestedField('tableStyle', 'rowPadding', parseInt(e.target.value) || 0)}
                                            min="0" max="50"
                                       />
                                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">px</span>
                                  </div>
                              </div>
                        </div>

                         {/* Content Spacing (Granular & Dynamic) */}
                         <div className="flex flex-col gap-3 py-3">
                              <span className="text-xs font-medium text-slate-600 whitespace-nowrap dark:text-slate-400">섹션 간격 (하단 여백)</span>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pl-2">
                                  {SPACING_CONFIG[data.layout].map((config) => (
                                      <div key={config.key} className="flex items-center justify-between">
                                          <span className="text-[11px] text-slate-500">{config.label}</span>
                                          <div className="relative w-20 flex items-center shrink-0">
                                               <Input 
                                                    type="number"
                                                    className="h-7 text-xs pr-7 text-right"
                                                    // @ts-ignore - dynamic key access
                                                    value={data.styleConfig.spacing[data.layout]?.[config.key] ?? 24}
                                                    onChange={(e) => updateSpacing(config.key, parseInt(e.target.value) || 0)}
                                                    min="0" max="200"
                                               />
                                               <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">px</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                        </div>
                    </div>
                </div>

                
                {/* Typography */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Type size={14} className="text-slate-400" />
                        <Label>폰트 및 색상 설정</Label>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 divide-y divide-slate-100 dark:bg-slate-900/50 dark:border-slate-800 dark:divide-slate-800">
                        <StyleRow label="문서 제목" sectionKey="header" />
                        <StyleRow label="공급자 정보" sectionKey="supplier" />
                        <StyleRow label="고객 정보" sectionKey="client" />
                        <StyleRow label="테이블 헤더" sectionKey="tableHeader" />
                        <StyleRow label="테이블 내용" sectionKey="tableItem" />
                        <StyleRow label="합계 금액" sectionKey="total" />
                        <div className="flex flex-col gap-2 py-1.5 border-b last:border-0 border-slate-100 dark:border-slate-800">
                           <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600 whitespace-nowrap dark:text-slate-400">비고/약관</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="relative w-20 flex items-center">
                                        <Input 
                                                type="number"
                                                className="h-9 text-sm pr-8"
                                                value={data.styleConfig.footer.fontSize}
                                                onChange={(e) => updateStyleConfig('footer', 'fontSize', parseInt(e.target.value) || 0)}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">px</span>
                                    </div>
                                    <div className="relative w-6 h-6 rounded-full border border-slate-200 overflow-hidden shadow-sm shrink-0 hover:ring-2 hover:ring-slate-100 transition-all cursor-pointer dark:border-slate-700 dark:hover:ring-slate-700">
                                        <input 
                                            type="color" 
                                            value={data.styleConfig.footer.color}
                                            onChange={(e) => updateStyleConfig('footer', 'color', e.target.value)}
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                            title="색상 변경"
                                        />
                                    </div>
                                </div>
                           </div>
                        </div>
                        <StyleRow label="계좌 정보" sectionKey="payment" />
                    </div>
                </div>


                {/* Layout */}
                <div className="space-y-2">
                     <div className="flex items-center gap-2 mb-2">
                        <Layout size={14} className="text-slate-400" />
                        <Label>테두리 및 레이아웃</Label>
                    </div>
                    <div className={cn("bg-slate-50 rounded-lg p-3 border border-slate-200 divide-y divide-slate-100 transition-opacity dark:bg-slate-900/50 dark:border-slate-800 dark:divide-slate-800", !isBorderSettingsEnabled && "opacity-50 pointer-events-none grayscale")}>
                        {/* Page Number Toggle Moved Here with Consistent Style */}
                         <div className="flex items-center justify-between py-1.5 border-b last:border-0 border-slate-100 gap-4 dark:border-slate-800 pointer-events-auto">
                                <span className="text-xs font-medium text-slate-600 whitespace-nowrap dark:text-slate-400">페이지 번호 표시</span>
                                <Switch 
                                    id="showPageNumbers"
                                    checked={data.styleConfig.footer.showPageNumbers}
                                    onCheckedChange={(checked) => updateStyleConfig('footer', 'showPageNumbers', checked)}
                                />
                        </div>
                         {/* Border Color */}
                         <div className="flex items-center justify-between py-1.5 border-b last:border-0 border-slate-100 gap-4 dark:border-slate-800">
                              <span className="text-xs font-medium text-slate-600 whitespace-nowrap dark:text-slate-400">테두리 색상</span>
                              <div className="flex items-center gap-2 shrink-0">
                                  <div className="relative w-6 h-6 rounded-full border border-slate-200 overflow-hidden shadow-sm shrink-0 hover:ring-2 hover:ring-slate-100 transition-all cursor-pointer dark:border-slate-700 dark:hover:ring-slate-700">
                                       <input 
                                          type="color" 
                                          value={data.tableStyle.borderColor}
                                          onChange={(e) => updateNestedField('tableStyle', 'borderColor', e.target.value)}
                                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                          title="색상 변경"
                                      />
                                  </div>
                              </div>
                         </div>
                         
                         {/* Header Border Width (Hidden for Modern/Classic) */}
                         {data.layout !== 'modern' && data.layout !== 'classic' && (
                             <div className="flex items-center justify-between py-1.5 border-b last:border-0 border-slate-100 gap-4 dark:border-slate-800">
                                  <span className="text-xs font-medium text-slate-600 whitespace-nowrap dark:text-slate-400">헤더 선 두께</span>
                                  <div className="flex items-center gap-2 shrink-0">
                                      <div className="relative w-20 flex items-center">
                                           <Input 
                                                type="number"
                                                className="h-9 text-sm pr-8"
                                                value={data.tableStyle.headerBorderBottomWidth}
                                                onChange={(e) => updateNestedField('tableStyle', 'headerBorderBottomWidth', parseInt(e.target.value) || 0)}
                                                min="0" max="10"
                                           />
                                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">px</span>
                                      </div>
                                  </div>
                             </div>
                         )}

                         {/* Modern Layout Specific Settings */}
                         {data.layout === 'modern' && (
                            <>
                                <div className="flex items-center justify-between py-1.5 border-b last:border-0 border-slate-100 gap-4 dark:border-slate-800">
                                    <span className="text-xs font-medium text-slate-600 whitespace-nowrap dark:text-slate-400">헤더 배경 색상</span>
                                    <div className="relative w-6 h-6 rounded-full border border-slate-200 overflow-hidden shadow-sm shrink-0 hover:ring-2 hover:ring-slate-100 transition-all cursor-pointer dark:border-slate-700 dark:hover:ring-slate-700">
                                        <input 
                                            type="color" 
                                            value={data.styleConfig.modernHeaderColor || '#0f172a'}
                                            onChange={(e) => onChange({ ...data, styleConfig: { ...data.styleConfig, modernHeaderColor: e.target.value } })}
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                            title="배경색 변경"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between py-1.5 border-b last:border-0 border-slate-100 gap-4 dark:border-slate-800">
                                    <span className="text-xs font-medium text-slate-600 whitespace-nowrap dark:text-slate-400">헤더 텍스트 색상</span>
                                    <div className="relative w-6 h-6 rounded-full border border-slate-200 overflow-hidden shadow-sm shrink-0 hover:ring-2 hover:ring-slate-100 transition-all cursor-pointer dark:border-slate-700 dark:hover:ring-slate-700">
                                        <input 
                                            type="color" 
                                            value={data.styleConfig.modernHeaderTextColor || '#ffffff'}
                                            onChange={(e) => onChange({ ...data, styleConfig: { ...data.styleConfig, modernHeaderTextColor: e.target.value } })}
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                            title="텍스트 색상 변경"
                                        />
                                    </div>
                                </div>
                            </>
                         )}

                         {/* Item Border Width */}
                         <div className="flex items-center justify-between py-1.5 border-b last:border-0 border-slate-100 gap-4 dark:border-slate-800">
                              <span className="text-xs font-medium text-slate-600 whitespace-nowrap dark:text-slate-400">항목 선 두께</span>
                              <div className="flex items-center gap-2 shrink-0">
                                  <div className="relative w-20 flex items-center">
                                       <Input 
                                            type="number"
                                            className="h-9 text-sm pr-8"
                                            value={data.tableStyle.itemBorderBottomWidth}
                                            onChange={(e) => updateNestedField('tableStyle', 'itemBorderBottomWidth', parseInt(e.target.value) || 0)}
                                            min="0" max="10"
                                       />
                                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">px</span>
                                  </div>
                              </div>
                         </div>
                         
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* 2. Basic Settings */}
      <Card id="form-section-header">
        <CardContent className="pt-6">
            <SectionHeader icon={CalendarIcon} title="기본 정보" />
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label>문서 제목</Label>
                    <Input 
                        value={data.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        placeholder="예: 견적서, 거래명세서"
                    />
                </div>
                 <div className="space-y-2">
                    <Label>견적 번호</Label>
                    <Input 
                        value={data.estimateNumber}
                        onChange={(e) => updateField('estimateNumber', e.target.value)}
                    />
                </div>
                <div>
                    <DatePicker 
                        label="발행일"
                        value={data.date}
                        onChange={(date) => updateField('date', date)}
                    />
                </div>
                <div>
                    <DatePicker 
                        label="유효기간"
                        value={data.validUntil}
                        onChange={(date) => updateField('validUntil', date)}
                    />
                </div>
            </div>
        </CardContent>
      </Card>

      {/* 3. Supplier Info */}
      <Card id="form-section-supplier">
        <CardContent className="pt-6">
            <SectionHeader icon={Briefcase} title="공급자 (나의 정보)" />
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label>상호명</Label>
                    <Input 
                        value={data.myInfo.name}
                        onChange={(e) => updateNestedField('myInfo', 'name', e.target.value)}
                    />
                 </div>
                 <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label>대표자</Label>
                    <Input 
                        value={data.myInfo.ceo}
                        onChange={(e) => updateNestedField('myInfo', 'ceo', e.target.value)}
                    />
                 </div>
                 <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label>사업자번호</Label>
                    <Input 
                        value={data.myInfo.registrationNumber}
                        onChange={(e) => updateNestedField('myInfo', 'registrationNumber', e.target.value)}
                    />
                 </div>
                 <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label>연락처</Label>
                    <Input 
                        value={data.myInfo.phone}
                        onChange={(e) => updateNestedField('myInfo', 'phone', e.target.value)}
                    />
                 </div>
                 <div className="space-y-1.5 col-span-2">
                    <Label>이메일</Label>
                    <Input 
                        value={data.myInfo.email}
                        onChange={(e) => updateNestedField('myInfo', 'email', e.target.value)}
                    />
                 </div>
                 <div className="space-y-1.5 col-span-2">
                    <Label>주소</Label>
                    <Input 
                        value={data.myInfo.address}
                        onChange={(e) => updateNestedField('myInfo', 'address', e.target.value)}
                    />
                 </div>
                 
                 <div className="col-span-2 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800" id="form-section-payment">
                     <div className="flex justify-between items-center mb-3">
                         <Label className="text-slate-600 font-semibold dark:text-slate-300">계좌 정보</Label>
                         <div className="flex items-center space-x-2">
                             <Label className="cursor-pointer font-normal text-xs text-slate-500 dark:text-slate-400" htmlFor="showPayment">견적서에 표시</Label>
                             <Switch 
                                 id="showPayment"
                                 checked={data.styleConfig.payment.show}
                                 onCheckedChange={(checked) => updateStyleConfig('payment', 'show', checked)}
                             />
                         </div>
                     </div>
                     <div className="grid grid-cols-3 gap-2">
                        <Input 
                            placeholder="은행" 
                            value={data.paymentInfo.bank}
                            onChange={(e) => updateNestedField('paymentInfo', 'bank', e.target.value)}
                        />
                        <Input 
                            placeholder="계좌번호" 
                            className="col-span-2"
                            value={data.paymentInfo.accountNumber}
                            onChange={(e) => updateNestedField('paymentInfo', 'accountNumber', e.target.value)}
                        />
                        <Input 
                            placeholder="예금주" 
                            className="col-span-3"
                            value={data.paymentInfo.holder}
                            onChange={(e) => updateNestedField('paymentInfo', 'holder', e.target.value)}
                        />
                     </div>
                 </div>
                 
                 <div className="col-span-2 mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 dark:border-slate-800">
                     <div>
                        <Label className="mb-2 block text-xs text-slate-500 dark:text-slate-400">로고 이미지</Label>
                        <div className="flex gap-3">
                            <div className="h-16 w-16 border border-slate-200 rounded-md bg-white flex items-center justify-center relative overflow-hidden shrink-0 dark:border-slate-700 dark:bg-slate-800">
                                {data.logo ? (
                                    <>
                                        <img src={data.logo} alt="logo preview" className="object-contain w-full h-full" />
                                        <button 
                                            onClick={() => updateField('logo', null)}
                                            className="absolute top-0 right-0 bg-slate-900/50 hover:bg-red-50 text-white p-1 rounded-bl transition-colors backdrop-blur-sm"
                                            title="삭제"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </>
                                ) : (
                                    <ImageIcon className="text-slate-300 dark:text-slate-600" size={20} />
                                )}
                            </div>
                            <label className="flex-1 cursor-pointer flex flex-col items-center justify-center h-16 border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-md transition-all text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-900/50 dark:text-slate-400 dark:hover:text-slate-200">
                                <Upload size={14} className="mb-1" />
                                <span className="text-[10px] font-medium">업로드</span>
                                <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoUpload} />
                            </label>
                        </div>
                     </div>
                     
                     <div>
                        <Label className="mb-2 block text-xs text-slate-500 dark:text-slate-400">직인(도장) 이미지</Label>
                        <div className="flex gap-3">
                            <div className="h-16 w-16 border border-slate-200 rounded-md bg-white flex items-center justify-center relative overflow-hidden shrink-0 dark:border-slate-700 dark:bg-slate-800">
                                {data.seal ? (
                                    <>
                                        <img src={data.seal} alt="seal preview" className="object-contain w-full h-full" />
                                        <button 
                                            onClick={() => updateField('seal', null)}
                                            className="absolute top-0 right-0 bg-slate-900/50 hover:bg-red-50 text-white p-1 rounded-bl transition-colors backdrop-blur-sm"
                                            title="삭제"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </>
                                ) : (
                                    <Stamp className="text-slate-300 dark:text-slate-600" size={20} />
                                )}
                            </div>
                            <label className="flex-1 cursor-pointer flex flex-col items-center justify-center h-16 border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-md transition-all text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-900/50 dark:text-slate-400 dark:hover:text-slate-200">
                                <Upload size={14} className="mb-1" />
                                <span className="text-[10px] font-medium">업로드</span>
                                <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleSealUpload} />
                            </label>
                        </div>
                     </div>
                 </div>
            </div>
        </CardContent>
      </Card>

      {/* 4. Client Info */}
      <Card id="form-section-client">
         <CardContent className="pt-6">
            <SectionHeader icon={User} title="고객 정보 (받는 분)" />
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label>고객명/상호</Label>
                    <Input 
                        value={data.clientInfo.name}
                        onChange={(e) => updateNestedField('clientInfo', 'name', e.target.value)}
                    />
                 </div>
                 <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label>담당자</Label>
                    <Input 
                        value={data.clientInfo.contactPerson}
                        onChange={(e) => updateNestedField('clientInfo', 'contactPerson', e.target.value)}
                    />
                 </div>
                 <div className="space-y-1.5 col-span-2">
                    <Label>이메일</Label>
                    <Input 
                        value={data.clientInfo.email}
                        onChange={(e) => updateNestedField('clientInfo', 'email', e.target.value)}
                    />
                 </div>
                 <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label>연락처</Label>
                    <Input 
                        value={data.clientInfo.phone || ''}
                        onChange={(e) => updateNestedField('clientInfo', 'phone', e.target.value)}
                    />
                 </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label>주소</Label>
                    <Input 
                        value={data.clientInfo.address || ''}
                        onChange={(e) => updateNestedField('clientInfo', 'address', e.target.value)}
                    />
                 </div>
            </div>
         </CardContent>
      </Card>

      {/* 5. Items */}
      <Card id="form-section-items">
        <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <Briefcase size={18} className="text-slate-500 dark:text-slate-400" />
                    <h3 className="font-bold text-sm uppercase tracking-wide">견적 항목</h3>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                    <Plus size={12} className="mr-1" /> 항목 추가
                </Button>
            </div>

            <div className="space-y-4">
                 {data.items.map((item, index) => (
                     <div 
                        key={item.id} 
                        draggable={hoveredHandleId === item.id}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className={`relative group border rounded-lg p-3 transition-colors ${dragItemIndex === index ? 'bg-slate-100 border-dashed border-slate-400 opacity-60 dark:bg-slate-800 dark:border-slate-500' : 'bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/50 dark:border-slate-800 dark:hover:bg-slate-900'}`}
                     >
                         {/* Drag Handle */}
                         <div 
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/50 transition-colors z-10 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                            onMouseEnter={() => setHoveredHandleId(item.id)}
                            onMouseLeave={() => setHoveredHandleId(null)}
                         >
                            <GripVertical size={18} />
                         </div>

                         <button 
                            onClick={() => removeItem(item.id)}
                            className="absolute right-2 top-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all z-10 dark:hover:bg-red-900/50 dark:hover:text-red-400"
                         >
                            <Trash2 size={16} />
                         </button>
                         
                         <div className="grid gap-3 pl-8">
                            <div className="grid grid-cols-1 gap-2">
                                 <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400">항목명</Label>
                                    <Input 
                                        value={item.name}
                                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                        placeholder="예: 웹사이트 디자인"
                                    />
                                 </div>
                                 {/* AI 설명 생성 버튼 숨김 처리됨 */}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400">상세 설명</Label>
                                <Input 
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    className="text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                 <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400">M/M</Label>
                                    <Input 
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                    />
                                 </div>
                                 <div className="space-y-1 relative">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400">단가</Label>
                                    <div className="relative">
                                        <Input 
                                            type="text"
                                            className="text-right pr-8"
                                            value={formatNumber(item.price)}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value.replace(/,/g, ''), 10) || 0;
                                                updateItem(item.id, 'price', val);
                                            }}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">원</span>
                                    </div>
                                 </div>
                            </div>
                         </div>
                     </div>
                 ))}
                 {data.items.length === 0 && (
                    <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 rounded border border-dashed dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-500">
                        항목이 없습니다. 항목을 추가해주세요.
                    </div>
                )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end items-center gap-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <Label className="text-slate-600 dark:text-slate-400">할인 설정</Label>
                    
                    {/* Amount Input */}
                    <div className="relative w-28">
                        <Input 
                            type="text"
                            className="text-right pr-7"
                            disabled={data.discountType === 'rate' && data.discount > 0}
                            value={data.discountType === 'amount' ? formatNumber(data.discount) : ''}
                            placeholder={data.discountType === 'rate' && data.discount > 0 ? '-' : '0'}
                            onChange={(e) => {
                                const val = parseInt(e.target.value.replace(/,/g, ''), 10) || 0;
                                onChange({
                                    ...data,
                                    discountType: 'amount',
                                    discount: val
                                });
                            }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">원</span>
                    </div>

                    {/* Rate Input */}
                    <div className="relative w-20">
                         <Input 
                            type="number"
                            className="text-right pr-6"
                            disabled={data.discountType === 'amount' && data.discount > 0}
                            value={data.discountType === 'rate' ? data.discount || '' : ''}
                            placeholder={data.discountType === 'amount' && data.discount > 0 ? '-' : '0'}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                onChange({
                                    ...data,
                                    discountType: 'rate',
                                    discount: val
                                });
                            }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* 6. Notes (Split) */}
      <Card id="form-section-notes">
        <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <FileText size={18} className="text-slate-500 dark:text-slate-400" />
                    <h3 className="font-bold text-sm uppercase tracking-wide">비고</h3>
                </div>
                {/* AI 자동작성 버튼 숨김 처리됨 */}
            </div>
            
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-2">
                             <Label className="cursor-pointer" htmlFor="showNotes">비고 (Notes)</Label>
                             <Switch 
                                 id="showNotes"
                                 checked={data.showNotes}
                                 onCheckedChange={(checked) => updateField('showNotes', checked)}
                             />
                         </div>
                         <Input 
                             value={data.notesTitle}
                             onChange={(e) => updateField('notesTitle', e.target.value)}
                             className="h-8 text-xs"
                             placeholder="제목 (예: 비고)"
                             disabled={!data.showNotes}
                         />
                    </div>
                    {data.showNotes && (
                        <Textarea 
                            value={data.notes}
                            onChange={(e) => updateField('notes', e.target.value)}
                            placeholder="추가 전달 사항 (예: 납기일, 감사의 말)"
                            className="min-h-[80px]"
                        />
                    )}
                </div>
            </div>
        </CardContent>
      </Card>

      {/* 7. Terms (Split) */}
      <Card id="form-section-terms">
        <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <FileText size={18} className="text-slate-500 dark:text-slate-400" />
                    <h3 className="font-bold text-sm uppercase tracking-wide">이용 약관</h3>
                </div>
            </div>
            
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-2">
                             <Label className="cursor-pointer" htmlFor="showTerms">이용 약관 (Terms)</Label>
                             <Switch 
                                 id="showTerms"
                                 checked={data.showTerms}
                                 onCheckedChange={(checked) => updateField('showTerms', checked)}
                             />
                         </div>
                         <Input 
                             value={data.termsTitle}
                             onChange={(e) => updateField('termsTitle', e.target.value)}
                             className="h-8 text-xs"
                             placeholder="제목 (예: 이용 약관)"
                             disabled={!data.showTerms}
                         />
                    </div>
                    {data.showTerms && (
                        <Textarea 
                            value={data.terms}
                            onChange={(e) => updateField('terms', e.target.value)}
                            placeholder="계약 조건, 결제 방식 등"
                            className="min-h-[80px]"
                        />
                    )}
                </div>
            </div>
        </CardContent>
      </Card>

    </div>
  );
};
