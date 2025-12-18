import React, { useMemo } from 'react';
import { EstimateData, LineItem, Margins, LayoutSpacing } from '../types';

interface EstimatePreviewProps {
  data: EstimateData;
  id: string;
  onSectionClick?: (sectionId: string) => void;
}

// --- Pagination Logic Helper ---
interface FooterSectionData {
    id: string;
    skipSpacing: boolean;
}

interface PageChunk {
  items: LineItem[];
  footerSections: FooterSectionData[];
  isFirst: boolean;
  pageNum: number;
}

const MM_TO_PX = 3.78; // Approx px per mm at 96 DPI
const SAFE_BUFFER_PX = 45; 

const BASE_HEADER_HEIGHTS = {
    default: 320,
    modern: 260,
    classic: 240,
    minimal: 280
};

const FOOTER_HEIGHTS = {
    totals: 160, 
    payment: 110,
    signature: 140 
};

const calculatePages = (data: EstimateData): PageChunk[] => {
    const PAGE_HEIGHT_PX = 297 * MM_TO_PX; 
    
    const { top, bottom, left, right } = data.styleConfig.margins || { top: 20, bottom: 20, left: 20, right: 20 };
    const TOP_MARGIN_PX = top * MM_TO_PX;
    
    const effectiveBottomMarginMm = data.styleConfig.footer.showPageNumbers ? Math.max(bottom, 15) : bottom;
    const BOTTOM_MARGIN_PX = effectiveBottomMarginMm * MM_TO_PX;
    
    const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT_PX - TOP_MARGIN_PX - BOTTOM_MARGIN_PX - SAFE_BUFFER_PX;
    const contentWidthMm = 210 - left - right;
    const contentWidthPx = contentWidthMm * MM_TO_PX;

    const itemFontSize = data.styleConfig.tableItem.fontSize || 14;
    const footerFontSize = data.styleConfig.footer.fontSize || 13;
    const itemLineHeight = itemFontSize * 1.6;
    const footerLineHeight = footerFontSize * 1.6;

    const rowPadding = data.tableStyle.rowPadding ?? 16;
    const verticalPadding = rowPadding * 2;
    const TABLE_HEADER_HEIGHT = 55;
    
    const HEADER_HEIGHT_SUB_PAGE = 80; 

    const getSpacing = (key: string) => {
        // @ts-ignore
        return (data.styleConfig.spacing[data.layout]?.[key] ?? 24);
    }

    let currentHeaderHeight = BASE_HEADER_HEIGHTS[data.layout] || 240;
    
    if (!data.logo && ['default', 'minimal'].includes(data.layout)) {
        currentHeaderHeight -= 60;
    }

    if (data.layout === 'default') {
        currentHeaderHeight += getSpacing('logoToTitle') + getSpacing('titleToClient') + getSpacing('clientToTable');
    } else if (data.layout === 'modern') {
        currentHeaderHeight += getSpacing('headerToInfo') + getSpacing('infoToTable');
    } else if (data.layout === 'classic') {
        currentHeaderHeight += getSpacing('titleToInfo') + getSpacing('infoToTable');
    } else if (data.layout === 'minimal') {
        currentHeaderHeight += getSpacing('titleToMeta') + getSpacing('metaToInfo') + getSpacing('infoToTable');
    }

    const pages: PageChunk[] = [];
    let currentItems: LineItem[] = [];
    let currentHeight = currentHeaderHeight + TABLE_HEADER_HEIGHT;
    
    data.items.forEach((item) => {
        const descColWidthPx = contentWidthPx * 0.5;
        const avgCharWidth = itemFontSize * 0.75; 
        const charsPerLine = Math.floor(descColWidthPx / avgCharWidth);
        const descLines = item.description ? Math.max(1, Math.ceil(item.description.length / charsPerLine)) : 0;
        
        const rowHeight = itemLineHeight + (descLines * itemLineHeight) + verticalPadding;

        if (currentHeight + rowHeight > PAGE_CONTENT_HEIGHT) {
            pages.push({ 
                items: currentItems, 
                footerSections: [],
                isFirst: pages.length === 0, 
                pageNum: pages.length + 1
            });
            currentItems = [item];
            currentHeight = HEADER_HEIGHT_SUB_PAGE + rowHeight;
        } else {
            currentItems.push(item);
            currentHeight += rowHeight;
        }
    });

    const footerQueue: { id: string, height: number, spacing: number }[] = [];
    const totalsHeight = data.layout === 'classic' ? 70 : FOOTER_HEIGHTS.totals;

    footerQueue.push({ id: 'totals', height: totalsHeight, spacing: getSpacing('tableToTotal') });

    if (data.styleConfig.payment.show) {
        footerQueue.push({ id: 'payment', height: FOOTER_HEIGHTS.payment, spacing: getSpacing('totalToPayment') });
    }

    if (data.showNotes && data.notes) {
        const charsPerLineFooter = Math.floor(contentWidthPx / (footerFontSize * 0.8));
        const lines = Math.ceil(data.notes.length / charsPerLineFooter) + (data.notes.match(/\n/g) || []).length;
        footerQueue.push({ id: 'notes', height: 50 + (lines * footerLineHeight), spacing: getSpacing('paymentToNotes') });
    }

    if (data.showTerms && data.terms) {
        const charsPerLineFooter = Math.floor(contentWidthPx / (footerFontSize * 0.8));
        const lines = Math.ceil(data.terms.length / charsPerLineFooter) + (data.terms.match(/\n/g) || []).length;
        footerQueue.push({ id: 'terms', height: 50 + (lines * footerLineHeight), spacing: getSpacing('notesToTerms') });
    }

    footerQueue.push({ id: 'signature', height: FOOTER_HEIGHTS.signature, spacing: getSpacing('termsToSignature') });

    let currentFooterSections: FooterSectionData[] = [];
    
    footerQueue.forEach(section => {
        const heightWithSpacing = section.height + section.spacing;

        if (currentHeight + heightWithSpacing <= PAGE_CONTENT_HEIGHT) {
            currentFooterSections.push({ id: section.id, skipSpacing: false });
            currentHeight += heightWithSpacing;
        } else {
            pages.push({ 
                items: currentItems, 
                footerSections: currentFooterSections, 
                isFirst: pages.length === 0, 
                pageNum: pages.length + 1
            });
            currentItems = []; 
            currentFooterSections = [{ id: section.id, skipSpacing: true }];
            currentHeight = HEADER_HEIGHT_SUB_PAGE + section.height; 
        }
    });

    pages.push({ 
        items: currentItems, 
        footerSections: currentFooterSections, 
        isFirst: pages.length === 0, 
        pageNum: pages.length + 1
    });

    return pages;
};

// --- Margin Visualization Component ---
const MarginVisualizer = ({ margins, show }: { margins: Margins, show: boolean }) => {
  if (!show) return null;

  const style: React.CSSProperties = {
    background: 'repeating-linear-gradient(45deg, rgba(255, 0, 0, 0.03) 0px, rgba(255, 0, 0, 0.03) 2px, transparent 2px, transparent 8px)',
    position: 'absolute',
    zIndex: 50,
    pointerEvents: 'none',
  };

  const borderStyle = '1px dashed rgba(255,0,0,0.15)';

  return (
    <div className="absolute inset-0 pointer-events-none margin-guide print:hidden" data-html2canvas-ignore="true">
      <div style={{ ...style, top: 0, left: 0, right: 0, height: `${margins.top}mm`, borderBottom: borderStyle }} />
      <div style={{ ...style, bottom: 0, left: 0, right: 0, height: `${margins.bottom}mm`, borderTop: borderStyle }} />
      <div style={{ ...style, top: 0, bottom: 0, left: 0, width: `${margins.left}mm`, borderRight: borderStyle }} />
      <div style={{ ...style, top: 0, bottom: 0, right: 0, width: `${margins.right}mm`, borderLeft: borderStyle }} />
    </div>
  );
};

// --- Spacing Visualization Component ---
const SpacingGuide = ({ height, show, hidden = false }: { height: number, show: boolean, hidden?: boolean }) => {
    if (hidden || height <= 0) return null;
    
    const style: React.CSSProperties = {
        height: `${height}px`,
        width: '100%',
        background: show ? 'repeating-linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0px, rgba(59, 130, 246, 0.1) 4px, transparent 4px, transparent 8px)' : undefined,
        borderTop: show ? '1px dashed rgba(59, 130, 246, 0.2)' : undefined,
        borderBottom: show ? '1px dashed rgba(59, 130, 246, 0.2)' : undefined,
        pointerEvents: 'none',
        display: 'block',
        marginTop: 0,
        marginBottom: 0,
    };

    return <div style={style} className="print:hidden spacing-guide" data-html2canvas-ignore="true" />;
};

export const EstimatePreview: React.FC<EstimatePreviewProps> = ({ data, onSectionClick }) => {
  const pages = useMemo(() => calculatePages(data), [data]);

  const subtotal = data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const taxAmount = Math.floor(subtotal * data.taxRate);
  const totalBeforeDiscount = subtotal + taxAmount;
  
  let discountAmount = 0;
  if (data.discountType === 'rate') {
      discountAmount = Math.floor(totalBeforeDiscount * (data.discount / 100));
  } else {
      discountAmount = data.discount || 0;
  }
  const total = totalBeforeDiscount - discountAmount;

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(val) + '원';
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };
  const formatSimpleDate = (dateStr: string) => dateStr || '';

  const ClickableArea = ({ children, sectionId, className = '', style }: { children?: React.ReactNode, sectionId: string, className?: string, style?: React.CSSProperties }) => {
      return (
          <div 
             className={`group/click transition-all hover:bg-indigo-50/20 cursor-pointer rounded-sm hover:outline hover:outline-2 hover:outline-indigo-400 hover:outline-offset-[-2px] ${className}`}
             onClick={(e) => {
                 e.stopPropagation();
                 onSectionClick?.(sectionId);
             }}
             style={style}
             title="클릭하여 수정하기"
          >
              {children}
          </div>
      )
  };

  const Spacing = ({ id, hidden = false }: { id: string, hidden?: boolean }) => {
      // @ts-ignore
      const spacingValue = (data.styleConfig.spacing[data.layout]?.[id] ?? 24);
      return <SpacingGuide height={spacingValue} show={data.styleConfig.showSpacingGuides} hidden={hidden} />;
  };

  const PageNumber = ({ current, total }: { current: number, total: number }) => {
      if (!data.styleConfig.footer.showPageNumbers) return null;
      return (
          <div 
            className="absolute left-0 w-full text-center text-xs text-slate-400 font-mono z-50 pointer-events-none"
            style={{ bottom: '7mm' }} 
          >
              {current} / {total}
          </div>
      );
  }

  const getItemRowStyle = (isLast: boolean) => {
      const style: React.CSSProperties = {
          borderBottomWidth: isLast ? 0 : `${data.tableStyle.itemBorderBottomWidth}px`,
          borderBottomColor: data.tableStyle.borderColor,
          color: data.styleConfig.tableItem.color,
          fontSize: `${data.styleConfig.tableItem.fontSize}px`,
      };
      return style;
  };

  const getItemCellStyle = () => {
      const padding = data.tableStyle.rowPadding ?? 16;
      return {
          paddingTop: `${padding}px`,
          paddingBottom: `${padding}px`,
          position: 'relative',
      } as React.CSSProperties;
  };

  const RowGuide = () => {
      if (!data.styleConfig.showSpacingGuides) return null;
      const padding = data.tableStyle.rowPadding ?? 16;
      return (
          <div 
             className="absolute inset-0 pointer-events-none print:hidden spacing-guide" 
             data-html2canvas-ignore="true"
             style={{ 
                 background: `linear-gradient(to bottom, rgba(59, 130, 246, 0.1) ${padding}px, transparent ${padding}px, transparent calc(100% - ${padding}px), rgba(59, 130, 246, 0.1) calc(100% - ${padding}px))` 
             }} 
          />
      );
  };

  const SignatureBlock = () => (
    <div className="inline-block text-left text-slate-800">
        <p className="font-bold mb-2 text-lg">위와 같이 견적합니다.</p>
        <p className="mb-4 font-medium text-slate-600">{formatDate(data.date)}</p>
        <div className="relative flex items-center gap-2">
            <span className="font-bold text-xl">{data.myInfo.name}</span>
            <span className="font-medium text-lg">대표</span>
            <span className="font-bold text-xl">{data.myInfo.ceo}</span>
            <span className="text-slate-400">(인)</span>
            {data.seal && (
                <img src={data.seal} alt="Company Seal" className="absolute -right-6 -top-5 w-20 h-20 object-contain mix-blend-multiply opacity-90 pointer-events-none select-none" />
            )}
        </div>
    </div>
  );

  const PaymentSection = () => {
    const { styleConfig } = data;
    if (!styleConfig.payment.show) return null;
    const isCleanLayout = ['default', 'minimal'].includes(data.layout);

    return (
        <ClickableArea 
            sectionId="form-section-payment" 
            className={isCleanLayout ? "block py-2" : "p-4 bg-slate-50 rounded-lg block"}
        >
            <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">계좌 정보 (PAYMENT INFO)</h3>
            <div className="font-medium tabular-nums" style={{ fontSize: `${styleConfig.payment.fontSize}px`, color: styleConfig.payment.color }}>
                {data.paymentInfo.bank && <span className="font-bold">{data.paymentInfo.bank}</span>}
                {data.paymentInfo.accountNumber && <span className="mx-2 text-slate-300">|</span>}
                <span>{data.paymentInfo.accountNumber}</span>
            </div>
            {data.paymentInfo.holder && <div className="text-sm text-slate-500 mt-1">예금주: {data.paymentInfo.holder}</div>}
        </ClickableArea>
    );
  };

  const NotesSection = () => {
     const { styleConfig } = data;
     if (!data.showNotes || !data.notes) return null;
     return (
        <ClickableArea sectionId="form-section-notes" className="block" style={{ fontSize: `${styleConfig.footer.fontSize}px`, color: styleConfig.footer.color }}>
            <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{data.notesTitle}</h3>
            <p className="leading-relaxed whitespace-pre-wrap">{data.notes}</p>
        </ClickableArea>
     );
  };

  const TermsSection = () => {
     const { styleConfig } = data;
     if (!data.showTerms || !data.terms) return null;
     return (
        <ClickableArea sectionId="form-section-terms" className="block" style={{ fontSize: `${styleConfig.footer.fontSize}px`, color: styleConfig.footer.color }}>
            <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{data.termsTitle}</h3>
            <p className="leading-relaxed whitespace-pre-wrap">{data.terms}</p>
        </ClickableArea>
     );
  };

  const TotalsSection = ({ widthClass = "w-5/12" }: { widthClass?: string }) => {
      const { styleConfig } = data;
      return (
        <ClickableArea sectionId="form-section-items" className="flex justify-end border-t border-slate-100 pt-8 mt-4">
            <div className={widthClass} style={{ fontSize: `${styleConfig.total.fontSize}px`, color: styleConfig.total.color }}>
                <div className="flex justify-between py-2 text-slate-600 tabular-nums">
                    <span style={{ fontSize: '0.9em' }}>소계</span>
                    <span className="font-semibold whitespace-nowrap">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between py-2 text-slate-600 border-b border-slate-100 mb-2 tabular-nums">
                    <span style={{ fontSize: '0.9em' }}>부가세 (10%)</span>
                    <span className="whitespace-nowrap">{formatCurrency(taxAmount)}</span>
                </div>
                {discountAmount > 0 && (
                <div className="flex justify-between py-2 text-red-500 border-b border-slate-100 mb-2 tabular-nums font-medium">
                    <span style={{ fontSize: '0.9em' }}>
                        할인 금액
                        {data.discountType === 'rate' && <span className="text-xs ml-1 opacity-80">({data.discount}%)</span>}
                    </span>
                    <span className="whitespace-nowrap">- {formatCurrency(discountAmount)}</span>
                </div>
                )}
                <div className="flex justify-between py-2 font-bold text-blue-600 tabular-nums" style={{ fontSize: '1.25em' }}>
                    <span>총계</span>
                    <span className="whitespace-nowrap">{formatCurrency(total)}</span>
                </div>
            </div>
        </ClickableArea>
      );
  }

  const ContainerStyle = {
      paddingTop: `${data.styleConfig.margins?.top || 20}mm`,
      paddingBottom: `${data.styleConfig.margins?.bottom || 20}mm`,
      paddingLeft: `${data.styleConfig.margins?.left || 20}mm`,
      paddingRight: `${data.styleConfig.margins?.right || 20}mm`,
  };
  
  const LayoutDefault = ({ chunk }: { chunk: PageChunk }) => {
      const { items, footerSections, isFirst } = chunk;
      const { styleConfig } = data;
      const cellStyle = getItemCellStyle();
      const getSectionData = (id: string) => footerSections.find(s => s.id === id);

      return (
          <div className="a4-page-export a4-page bg-white relative flex flex-col h-[297mm] overflow-hidden" style={ContainerStyle}>
              <MarginVisualizer margins={data.styleConfig.margins} show={data.styleConfig.showMarginGuides} />
              <div className="flex-1 relative z-10">
                  {isFirst ? (
                     <>
                        <div className="flex justify-between items-start">
                            <ClickableArea sectionId="form-section-header" className="flex flex-col">
                                <div className="flex items-center justify-center overflow-hidden mb-2" style={{ width: '140px', height: '60px', justifyContent: 'flex-start' }}>
                                    {data.logo ? (
                                    <img src={data.logo} alt="Company Logo" className="object-contain w-full h-full object-left" />
                                    ) : (
                                    <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
                                            <path d="M3 21h18M3 10h18M3 7l9-4 9 4M5 10v11M19 10v11M9 10v11M15 10v11" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    )}
                                </div>
                                <Spacing id="logoToTitle" />
                                <div>
                                    <h1 className="font-extrabold mb-1 tracking-tight" style={{ fontSize: `${styleConfig.header.fontSize}px`, color: styleConfig.header.color }}>{data.title}</h1>
                                    <p className="text-slate-500 text-sm tracking-wide font-medium">NO. {data.estimateNumber}</p>
                                </div>
                            </ClickableArea>
                            <ClickableArea sectionId="form-section-supplier" className="text-right" style={{ fontSize: `${styleConfig.supplier.fontSize}px`, color: styleConfig.supplier.color }}>
                                <h2 className="font-bold text-lg mb-1" style={{ color: styleConfig.header.color }}>{data.myInfo.name}</h2>
                                <div className="space-y-0.5 tabular-nums">
                                    <p>{data.myInfo.address}</p>
                                    <p>{data.myInfo.email}</p>
                                    <p>{data.myInfo.phone}</p>
                                    <p>사업자번호: {data.myInfo.registrationNumber}</p>
                                </div>
                            </ClickableArea>
                        </div>
                        
                        <Spacing id="titleToClient" />

                        <div className="bg-slate-50 rounded-lg p-5 grid grid-cols-12 gap-5">
                            <ClickableArea sectionId="form-section-client" className="col-span-6">
                                <h3 className="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">청구/수신 (BILL TO)</h3>
                                <p className="font-bold text-lg text-slate-900 mb-0.5">{data.clientInfo.name}</p>
                                <div className="space-y-0.5 tabular-nums" style={{ fontSize: `${styleConfig.client.fontSize}px`, color: styleConfig.client.color }}>
                                    {data.clientInfo.address && <p>{data.clientInfo.address}</p>}
                                    <p>{data.clientInfo.email}</p>
                                    {data.clientInfo.phone && <p>{data.clientInfo.phone}</p>}
                                </div>
                            </ClickableArea>
                            <ClickableArea sectionId="form-section-header" className="col-span-3">
                                <h3 className="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">발행일 (DATE)</h3>
                                <p className="font-semibold text-slate-900 tabular-nums">{formatSimpleDate(data.date)}</p>
                            </ClickableArea>
                            <ClickableArea sectionId="form-section-header" className="col-span-3">
                                <h3 className="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">만료일 (DUE DATE)</h3>
                                <p className="font-semibold text-slate-900 tabular-nums">{formatSimpleDate(data.validUntil)}</p>
                            </ClickableArea>
                        </div>

                        <Spacing id="clientToTable" />
                     </>
                  ) : null}

                  {items.length > 0 && (
                      <ClickableArea sectionId="form-section-items" className="block">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr style={{
                                borderBottomWidth: `${data.tableStyle.headerBorderBottomWidth}px`,
                                borderBottomColor: data.tableStyle.borderColor,
                                color: styleConfig.tableHeader.color,
                                fontSize: `${styleConfig.tableHeader.fontSize}px`
                            }}>
                                <th className="py-3 font-bold w-1/2">항목</th>
                                <th className="py-3 font-bold text-center w-24">M/M</th>
                                <th className="py-3 font-bold text-right">단가</th>
                                <th className="py-3 font-bold text-right">합계</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((item, idx) => (
                                <tr key={item.id} style={getItemRowStyle(idx === items.length - 1)}>
                                <td className="pr-4 align-top" style={cellStyle}>
                                    <RowGuide />
                                    <p className="font-bold mb-1">{item.name}</p>
                                    <p className="text-slate-500" style={{ fontSize: `${Math.max(10, styleConfig.tableItem.fontSize - 2)}px` }}>{item.description}</p>
                                </td>
                                <td className="text-center align-top tabular-nums" style={cellStyle}><RowGuide />{item.quantity}</td>
                                <td className="text-right align-top tabular-nums whitespace-nowrap" style={cellStyle}><RowGuide />{formatCurrency(item.price)}</td>
                                <td className="text-right align-top font-semibold tabular-nums whitespace-nowrap" style={cellStyle}>
                                    <RowGuide />
                                    {formatCurrency(item.price * item.quantity)}
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </ClickableArea>
                  )}

                  {getSectionData('totals') && (
                      <>
                        <Spacing id="tableToTotal" hidden={getSectionData('totals')?.skipSpacing} />
                        <TotalsSection />
                      </>
                  )}
                  {getSectionData('payment') && (
                      <>
                        <Spacing id="totalToPayment" hidden={getSectionData('payment')?.skipSpacing} />
                        <PaymentSection />
                      </>
                  )}
                  {getSectionData('notes') && (
                      <>
                        <Spacing id="paymentToNotes" hidden={getSectionData('notes')?.skipSpacing} />
                        <NotesSection />
                      </>
                  )}
                  {getSectionData('terms') && (
                      <>
                        <Spacing id="notesToTerms" hidden={getSectionData('terms')?.skipSpacing} />
                        <TermsSection />
                      </>
                  )}
                  
                  {getSectionData('signature') && (
                    <>
                        <Spacing id="termsToSignature" hidden={getSectionData('signature')?.skipSpacing} />
                        <div className="text-right">
                            <ClickableArea sectionId="form-section-supplier" className="inline-block">
                                <SignatureBlock />
                            </ClickableArea>
                        </div>
                    </>
                  )}
              </div>
              <PageNumber current={chunk.pageNum} total={pages.length} />
          </div>
      );
  }

  const LayoutModern = ({ chunk }: { chunk: PageChunk }) => {
      const { items, footerSections, isFirst } = chunk;
      const { styleConfig } = data;
      const margins = data.styleConfig.margins || { top: 20, bottom: 20, left: 20, right: 20 };
      const cellStyle = getItemCellStyle();
      
      const bleedStyle = {
          marginTop: `-${margins.top}mm`,
          marginLeft: `-${margins.left}mm`,
          marginRight: `-${margins.right}mm`,
          padding: `${margins.top}mm ${margins.right}mm 20px ${margins.left}mm`, 
          backgroundColor: styleConfig.modernHeaderColor || styleConfig.header.color,
      };

      const headerTextColor = styleConfig.modernHeaderTextColor || '#ffffff';
      const getSectionData = (id: string) => footerSections.find(s => s.id === id);

      return (
        <div className="a4-page-export a4-page bg-white relative flex flex-col h-[297mm] overflow-hidden" style={ContainerStyle}>
            <MarginVisualizer margins={data.styleConfig.margins} show={data.styleConfig.showMarginGuides} />
            <div className="flex-1 relative z-10">
                {isFirst ? (
                    <>
                        <ClickableArea sectionId="form-section-header" style={bleedStyle} className="flex justify-between items-center">
                            <div>
                                <h1 className="font-extrabold text-4xl mb-2 tracking-tight" style={{ color: headerTextColor }}>{data.title}</h1>
                                <p className="opacity-80 font-medium" style={{ color: headerTextColor }}>NO. {data.estimateNumber}</p>
                            </div>
                            <div className="text-right" style={{ color: headerTextColor }}>
                                <p className="text-sm opacity-70 mb-1">총계 (TOTAL)</p>
                                <p className="text-3xl font-bold tabular-nums">{formatCurrency(total)}</p>
                            </div>
                        </ClickableArea>

                        <Spacing id="headerToInfo" />

                        <div className="grid grid-cols-2 gap-8">
                            <ClickableArea sectionId="form-section-supplier">
                                <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider border-b border-slate-200 pb-2">공급자</h3>
                                <div className="space-y-3">
                                    {data.logo && <img src={data.logo} alt="logo" className="h-12 object-contain mb-4" />}
                                    <div style={{ fontSize: `${styleConfig.supplier.fontSize}px`, color: styleConfig.supplier.color }}>
                                        <p className="font-bold text-lg mb-1 text-slate-900">{data.myInfo.name}</p>
                                        <p>{data.myInfo.address}</p>
                                        <p>{data.myInfo.email}</p>
                                        <p>{data.myInfo.phone}</p>
                                        <p>사업자번호: {data.myInfo.registrationNumber}</p>
                                    </div>
                                </div>
                            </ClickableArea>
                            <ClickableArea sectionId="form-section-client">
                                <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider border-b border-slate-200 pb-2">청구/수신 (BILL TO)</h3>
                                <div style={{ fontSize: `${styleConfig.client.fontSize}px`, color: styleConfig.client.color }}>
                                    <p className="font-bold text-lg mb-1 text-slate-900">{data.clientInfo.name}</p>
                                    <p>{data.clientInfo.contactPerson}</p>
                                    <p>{data.clientInfo.address}</p>
                                    <p>{data.clientInfo.email}</p>
                                    <p>{data.clientInfo.phone}</p>
                                    <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="block text-xs text-slate-400">발행일 (DATE)</span>
                                            <span className="font-medium tabular-nums text-slate-800">{formatSimpleDate(data.date)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-400">만료일 (DUE DATE)</span>
                                            <span className="font-medium tabular-nums text-slate-800">{formatSimpleDate(data.validUntil)}</span>
                                        </div>
                                    </div>
                                </div>
                            </ClickableArea>
                        </div>

                        <Spacing id="infoToTable" />
                    </>
                ) : null}

                {items.length > 0 && (
                    <ClickableArea sectionId="form-section-items" className="block">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50">
                            <tr style={{ color: styleConfig.tableHeader.color, fontSize: `${styleConfig.tableHeader.fontSize}px` }}>
                                <th className="py-3 px-4 font-bold w-1/2">항목</th>
                                <th className="py-3 px-4 font-bold text-center w-24">M/M</th>
                                <th className="py-3 px-4 font-bold text-right">단가</th>
                                <th className="py-3 px-4 font-bold text-right">합계</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((item, idx) => (
                                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} style={getItemRowStyle(idx === items.length - 1)}>
                                <td className="px-4 align-top" style={cellStyle}>
                                    <RowGuide />
                                    <p className="font-bold mb-1">{item.name}</p>
                                    <p className="text-slate-500 opacity-80" style={{ fontSize: '0.9em' }}>{item.description}</p>
                                </td>
                                <td className="px-4 text-center align-top tabular-nums" style={cellStyle}><RowGuide />{item.quantity}</td>
                                <td className="px-4 text-right align-top tabular-nums whitespace-nowrap" style={cellStyle}><RowGuide />{formatCurrency(item.price)}</td>
                                <td className="px-4 text-right align-top font-bold tabular-nums whitespace-nowrap" style={cellStyle}><RowGuide />{formatCurrency(item.price * item.quantity)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </ClickableArea>
                )}

                {getSectionData('totals') && (
                    <>
                        <Spacing id="tableToTotal" hidden={getSectionData('totals')?.skipSpacing} />
                        <div className="flex justify-end mb-8">
                            <ClickableArea sectionId="form-section-items" className="w-1/2 space-y-2 block">
                                <div className="flex justify-between px-4 text-slate-500">
                                    <span>소계</span>
                                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between px-4 text-slate-500">
                                    <span>부가세 (10%)</span>
                                    <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between px-4 text-red-500">
                                        <span>할인 금액</span>
                                        <span className="tabular-nums">- {formatCurrency(discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between px-4 py-3 text-white rounded font-bold text-lg mt-2 items-center" style={{ backgroundColor: styleConfig.modernHeaderColor || styleConfig.header.color }}>
                                    <span>총계</span>
                                    <span className="tabular-nums">{formatCurrency(total)}</span>
                                </div>
                            </ClickableArea>
                        </div>
                    </>
                )}
                {getSectionData('payment') && (
                    <>
                        <Spacing id="totalToPayment" hidden={getSectionData('payment')?.skipSpacing} />
                        <PaymentSection />
                    </>
                )}
                {getSectionData('notes') && (
                    <>
                        <Spacing id="paymentToNotes" hidden={getSectionData('notes')?.skipSpacing} />
                        <PaymentSection />
                    </>
                )}
                {getSectionData('terms') && (
                    <>
                        <Spacing id="notesToTerms" hidden={getSectionData('terms')?.skipSpacing} />
                        <TermsSection />
                    </>
                )}
                
                {getSectionData('signature') && (
                    <>
                        <Spacing id="termsToSignature" hidden={getSectionData('signature')?.skipSpacing} />
                        <div className="text-right">
                            <ClickableArea sectionId="form-section-supplier" className="inline-block">
                                <SignatureBlock />
                            </ClickableArea>
                        </div>
                    </>
                )}
            </div>
            <PageNumber current={chunk.pageNum} total={pages.length} />
        </div>
      );
  }

  const LayoutClassic = ({ chunk }: { chunk: PageChunk }) => {
      const { items, footerSections, isFirst } = chunk;
      const { styleConfig } = data;
      const cellStyle = getItemCellStyle();
      const borderColor = data.tableStyle.borderColor;
      const thStyle = {
          border: `1px solid ${borderColor}`,
          borderBottomWidth: `${data.tableStyle.headerBorderBottomWidth}px`,
          color: styleConfig.tableHeader.color,
          fontSize: `${styleConfig.tableHeader.fontSize}px`
      };
      const tdStyle = {
          ...cellStyle,
          border: `1px solid ${borderColor}`,
          borderBottomWidth: `${data.tableStyle.itemBorderBottomWidth}px`
      };
      const getSectionData = (id: string) => footerSections.find(s => s.id === id);

      return (
        <div className="a4-page-export a4-page bg-white relative h-[297mm] overflow-hidden" style={ContainerStyle}>
            <MarginVisualizer margins={data.styleConfig.margins} show={data.styleConfig.showMarginGuides} />
            <div className="h-full flex flex-col justify-between p-4 pb-[15mm] border-2 relative z-10" style={{ borderColor: styleConfig.header.color }}>
                <div className="flex-1">
                    {isFirst ? (
                        <>
                            <ClickableArea sectionId="form-section-header" className="text-center border-b-2 pb-6 mb-6 block" style={{ borderColor: styleConfig.header.color }}>
                                <h1 className="text-3xl font-serif font-bold tracking-widest underline decoration-double decoration-2 underline-offset-4" style={{ color: styleConfig.header.color }}>{data.title}</h1>
                            </ClickableArea>

                            <Spacing id="titleToInfo" />

                            <div className="flex justify-between gap-4">
                                <div className="flex-1 border" style={{ borderColor }}>
                                    <div className="bg-slate-100 p-2 text-center font-bold border-b text-sm" style={{ borderColor }}>공급자</div>
                                    <ClickableArea sectionId="form-section-supplier" className="p-4 text-sm space-y-1 relative block h-full" style={{ fontSize: `${styleConfig.supplier.fontSize}px`, color: styleConfig.supplier.color }}>
                                        <div className="flex"><span className="w-20 text-slate-500">사업자번호</span><span>{data.myInfo.registrationNumber}</span></div>
                                        <div className="flex"><span className="w-20 text-slate-500">상호</span><span>{data.myInfo.name}</span></div>
                                        <div className="flex"><span className="w-20 text-slate-500">대표자</span><span>{data.myInfo.ceo}</span></div>
                                        <div className="flex"><span className="w-20 text-slate-500">주소</span><span>{data.myInfo.address}</span></div>
                                        <div className="flex"><span className="w-20 text-slate-500">연락처</span><span>{data.myInfo.phone}</span></div>
                                        {data.seal && <img src={data.seal} alt="seal" className="absolute right-2 bottom-2 w-16 h-16 object-contain mix-blend-multiply opacity-80" />}
                                    </ClickableArea>
                                </div>
                                <div className="flex-1 border" style={{ borderColor }}>
                                    <div className="bg-slate-100 p-2 text-center font-bold border-b text-sm" style={{ borderColor }}>청구/수신 (BILL TO)</div>
                                    <ClickableArea sectionId="form-section-client" className="p-4 text-sm space-y-1 block h-full" style={{ fontSize: `${styleConfig.client.fontSize}px`, color: styleConfig.client.color }}>
                                        <div className="flex"><span className="w-20 text-slate-500">상호명</span><span className="font-bold">{data.clientInfo.name}</span></div>
                                        <div className="flex"><span className="w-20 text-slate-500">담당자</span><span>{data.clientInfo.contactPerson}</span></div>
                                        <div className="flex"><span className="w-20 text-slate-500">연락처</span><span>{data.clientInfo.phone}</span></div>
                                        <div className="flex"><span className="w-20 text-slate-500">이메일</span><span>{data.clientInfo.email}</span></div>
                                    </ClickableArea>
                                </div>
                            </div>
                            <ClickableArea sectionId="form-section-header" className="flex justify-between items-center px-2 text-sm mt-4">
                                <div>견적번호 : <span className="font-medium">{data.estimateNumber}</span></div>
                                <div>발행일 (DATE) : <span className="font-medium">{formatSimpleDate(data.date)}</span></div>
                                <div>만료일 (DUE DATE) : <span className="font-medium">{formatSimpleDate(data.validUntil)}</span></div>
                            </ClickableArea>

                            <Spacing id="infoToTable" />
                        </>
                    ) : null}

                    {items.length > 0 && (
                        <ClickableArea sectionId="form-section-items" className="block">
                            <table className="w-full border-collapse border mb-6 text-sm" style={{ borderColor }}>
                                <thead>
                                    <tr className="bg-slate-100" style={{ color: styleConfig.tableHeader.color }}>
                                        <th className="py-2 px-2 w-10 text-center" style={thStyle}>No</th>
                                        <th className="py-2 px-2" style={thStyle}>항목</th>
                                        <th className="py-2 px-2 w-16 text-center" style={thStyle}>M/M</th>
                                        <th className="py-2 px-2 w-24 text-right" style={thStyle}>단가</th>
                                        <th className="py-2 px-2 w-28 text-right" style={thStyle}>합계</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={item.id} style={{ color: styleConfig.tableItem.color }}>
                                            <td className="px-2 text-center" style={tdStyle}><RowGuide />{idx + 1}</td>
                                            <td className="px-2" style={tdStyle}>
                                                <RowGuide />
                                                <div className="font-bold">{item.name}</div>
                                                <div className="text-xs text-slate-500">{item.description}</div>
                                            </td>
                                            <td className="px-2 text-center" style={tdStyle}><RowGuide />{item.quantity}</td>
                                            <td className="px-2 text-right tabular-nums whitespace-nowrap" style={tdStyle}><RowGuide />{formatCurrency(item.price)}</td>
                                            <td className="px-2 text-right tabular-nums whitespace-nowrap" style={tdStyle}><RowGuide />{formatCurrency(item.price * item.quantity)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ClickableArea>
                    )}
                    
                    {getSectionData('totals') && (
                        <>
                            <Spacing id="tableToTotal" hidden={getSectionData('totals')?.skipSpacing} />
                            <ClickableArea sectionId="form-section-items" className="block">
                                <table className="w-full border-collapse border mb-6 text-sm" style={{ marginTop: items.length > 0 ? '-1px' : '0', borderColor }}>
                                    <tbody>
                                        <tr style={{ color: styleConfig.tableItem.color }}>
                                            <td className="border py-2 px-2 text-center bg-slate-50 font-bold w-[calc(100%-7rem)]" style={{ borderColor }}>총계</td>
                                            <td className="border py-2 px-2 text-right font-bold text-lg tabular-nums bg-slate-50 whitespace-nowrap w-28" style={{ borderColor }}>{formatCurrency(total)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </ClickableArea>
                        </>
                    )}

                    {getSectionData('payment') && (
                        <>
                            <Spacing id="totalToPayment" hidden={getSectionData('payment')?.skipSpacing} />
                            <PaymentSection />
                        </>
                    )}
                    {getSectionData('notes') && (
                        <>
                            <Spacing id="paymentToNotes" hidden={getSectionData('notes')?.skipSpacing} />
                            <NotesSection />
                        </>
                    )}
                    {getSectionData('terms') && (
                        <>
                            <Spacing id="notesToTerms" hidden={getSectionData('terms')?.skipSpacing} />
                            <TermsSection />
                        </>
                    )}

                    {getSectionData('signature') && (
                        <>
                            <Spacing id="termsToSignature" hidden={getSectionData('signature')?.skipSpacing} />
                            <div className="text-right">
                                <ClickableArea sectionId="form-section-supplier" className="inline-block">
                                    <SignatureBlock />
                                </ClickableArea>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <PageNumber current={chunk.pageNum} total={pages.length} />
        </div>
      );
  }

  const LayoutMinimal = ({ chunk }: { chunk: PageChunk }) => {
      const { items, footerSections, isFirst } = chunk;
      const { styleConfig } = data;
      const cellStyle = getItemCellStyle();
      const getSectionData = (id: string) => footerSections.find(s => s.id === id);

      return (
        <div className="a4-page-export a4-page bg-white relative flex flex-col h-[297mm] overflow-hidden" style={ContainerStyle}>
             <MarginVisualizer margins={data.styleConfig.margins} show={data.styleConfig.showMarginGuides} />
             <div className="flex-1 relative z-10">
                {isFirst ? (
                    <>
                        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4">
                            <ClickableArea sectionId="form-section-header">
                                <h1 className="font-bold text-3xl tracking-tight" style={{ color: styleConfig.header.color }}>{data.title}</h1>
                            </ClickableArea>
                             <div className="text-right text-sm">
                                <ClickableArea sectionId="form-section-supplier">
                                    <div className="font-bold text-lg">{data.myInfo.name}</div>
                                </ClickableArea>
                             </div>
                        </div>

                        <Spacing id="titleToMeta" />

                        <ClickableArea sectionId="form-section-header" className="grid grid-cols-3 gap-8 text-sm text-slate-600 mb-6">
                            <div>
                                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Estimate No.</span>
                                <span className="font-mono text-slate-900">{data.estimateNumber}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Date</span>
                                <span className="text-slate-900">{formatSimpleDate(data.date)}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Valid Until</span>
                                <span className="text-slate-900">{formatSimpleDate(data.validUntil)}</span>
                            </div>
                        </ClickableArea>
                        
                        <Spacing id="metaToInfo" />

                        <div className="grid grid-cols-2 gap-8 text-sm">
                            <ClickableArea sectionId="form-section-supplier">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">From</div>
                                <div style={{ fontSize: `${styleConfig.supplier.fontSize}px`, color: styleConfig.supplier.color }}>
                                    <p className="font-bold text-slate-900">{data.myInfo.name}</p>
                                    <p>{data.myInfo.ceo}</p>
                                    <p>{data.myInfo.address}</p>
                                    <p>{data.myInfo.email}</p>
                                    <p>{data.myInfo.phone}</p>
                                </div>
                            </ClickableArea>
                            <ClickableArea sectionId="form-section-client">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">To</div>
                                <div style={{ fontSize: `${styleConfig.client.fontSize}px`, color: styleConfig.client.color }}>
                                    <p className="font-bold text-slate-900">{data.clientInfo.name}</p>
                                    <p>{data.clientInfo.contactPerson}</p>
                                    <p>{data.clientInfo.address}</p>
                                    <p>{data.clientInfo.email}</p>
                                    <p>{data.clientInfo.phone}</p>
                                </div>
                            </ClickableArea>
                        </div>

                        <Spacing id="infoToTable" />
                    </>
                ) : null}

                {items.length > 0 && (
                    <ClickableArea sectionId="form-section-items" className="block">
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{
                                    borderBottomWidth: `${data.tableStyle.headerBorderBottomWidth}px`,
                                    borderBottomColor: data.tableStyle.borderColor,
                                    color: styleConfig.tableHeader.color
                                }}>
                                    <th className="py-2 font-medium text-xs uppercase tracking-wider w-1/2">Item</th>
                                    <th className="py-2 font-medium text-xs uppercase tracking-wider text-center w-24">Qty</th>
                                    <th className="py-2 font-medium text-xs uppercase tracking-wider text-right">Price</th>
                                    <th className="py-2 font-medium text-xs uppercase tracking-wider text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item, idx) => (
                                    <tr key={item.id} style={getItemRowStyle(idx === items.length - 1)}>
                                        <td className="py-3 pr-4 align-top" style={cellStyle}>
                                            <RowGuide />
                                            <p className="font-medium text-slate-900">{item.name}</p>
                                            <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
                                        </td>
                                        <td className="py-3 text-center align-top tabular-nums text-slate-600" style={cellStyle}><RowGuide />{item.quantity}</td>
                                        <td className="py-3 text-right align-top tabular-nums text-slate-600" style={cellStyle}><RowGuide />{formatCurrency(item.price)}</td>
                                        <td className="py-3 text-right align-top font-medium tabular-nums text-slate-900" style={cellStyle}><RowGuide />{formatCurrency(item.price * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ClickableArea>
                )}

                {getSectionData('totals') && (
                      <>
                        <Spacing id="tableToTotal" hidden={getSectionData('totals')?.skipSpacing} />
                        <div className="flex justify-end mt-4">
                            <div className="w-1/2">
                                <TotalsSection widthClass="w-full" />
                            </div>
                        </div>
                      </>
                  )}
                  {getSectionData('payment') && (
                      <>
                        <Spacing id="totalToPayment" hidden={getSectionData('payment')?.skipSpacing} />
                        <PaymentSection />
                      </>
                  )}
                  {getSectionData('notes') && (
                      <>
                        <Spacing id="paymentToNotes" hidden={getSectionData('notes')?.skipSpacing} />
                        <NotesSection />
                      </>
                  )}
                  {getSectionData('terms') && (
                      <>
                        <Spacing id="notesToTerms" hidden={getSectionData('terms')?.skipSpacing} />
                        <TermsSection />
                      </>
                  )}
                  
                  {getSectionData('signature') && (
                    <>
                        <Spacing id="termsToSignature" hidden={getSectionData('signature')?.skipSpacing} />
                        <div>
                            <ClickableArea sectionId="form-section-supplier" className="flex items-center justify-end">
                                <SignatureBlock />
                            </ClickableArea>
                        </div>
                    </>
                  )}
             </div>
             <PageNumber current={chunk.pageNum} total={pages.length} />
        </div>
      );
  }

  return (
    <div className="flex flex-col gap-8 items-center print:block print:gap-0">
        {pages.map((chunk, idx) => (
            <React.Fragment key={idx}>
                {data.layout === 'default' && <LayoutDefault chunk={chunk} />}
                {data.layout === 'modern' && <LayoutModern chunk={chunk} />}
                {data.layout === 'classic' && <LayoutClassic chunk={chunk} />}
                {data.layout === 'minimal' && <LayoutMinimal chunk={chunk} />}
                <div className="h-0 w-full print:hidden"></div>
            </React.Fragment>
        ))}
    </div>
  );
};