export interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
}

export interface CompanyInfo {
  name: string;
  ceo: string;
  registrationNumber: string;
  address: string;
  phone: string;
  email: string;
}

export interface ClientInfo {
  name: string;
  contactPerson: string;
  email: string;
  address?: string;
  phone?: string;
}

export interface PaymentInfo {
  bank: string;
  accountNumber: string;
  holder: string;
}

export interface TableStyle {
  borderColor: string;
  headerBorderBottomWidth: number; // in px
  itemBorderBottomWidth: number; // in px
  rowPadding: number; // in px (top and bottom padding for each row)
}

export interface SectionStyle {
  fontSize: number; // px
  color: string;
}

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface LayoutSpacing {
  default: {
    logoToTitle: number;
    titleToClient: number;
    clientToTable: number;
    tableToTotal: number;
    totalToPayment: number;
    paymentToNotes: number;
    notesToTerms: number;
    termsToSignature: number;
  };
  modern: {
    headerToInfo: number;
    infoToTable: number;
    tableToTotal: number;
    totalToPayment: number;
    paymentToNotes: number;
    notesToTerms: number;
    termsToSignature: number;
  };
  classic: {
    titleToInfo: number;
    infoToTable: number;
    tableToTotal: number;
    totalToPayment: number;
    paymentToNotes: number;
    notesToTerms: number;
    termsToSignature: number;
  };
  minimal: {
    titleToMeta: number;
    metaToInfo: number;
    infoToTable: number;
    tableToTotal: number;
    totalToPayment: number;
    paymentToNotes: number;
    notesToTerms: number;
    termsToSignature: number;
  };
}

export interface StyleConfig {
  header: SectionStyle; // Title "견적서"
  supplier: SectionStyle; // Supplier Info
  client: SectionStyle; // Client Info
  tableHeader: SectionStyle;
  tableItem: SectionStyle;
  total: SectionStyle;
  footer: SectionStyle & { showPageNumbers: boolean }; // Added showPageNumbers
  payment: SectionStyle & { show: boolean };
  margins: Margins; // Page margins in mm
  useDefaultMargins: boolean; // Toggle for default margins (15mm)
  showMarginGuides: boolean; // Toggle for margin visualizer
  showSpacingGuides: boolean; // Toggle for item/section spacing visualizer
  spacing: LayoutSpacing; // Layout-specific granular spacing
  modernHeaderColor?: string; // Optional override for Modern layout header background
  modernHeaderTextColor?: string; // Optional override for Modern layout header text
}

export type EstimateLayout = 'default' | 'modern' | 'classic' | 'minimal';

export interface EstimateData {
  layout: EstimateLayout; // New field for layout selection
  title: string; // Document title (e.g., "견적서")
  estimateNumber: string;
  date: string;
  validUntil: string;
  myInfo: CompanyInfo;
  clientInfo: ClientInfo;
  items: LineItem[];
  
  notes: string;
  notesTitle: string; // Customizable title
  showNotes: boolean; // Toggle visibility

  terms: string;
  termsTitle: string; // Customizable title
  showTerms: boolean; // Toggle visibility

  paymentInfo: PaymentInfo;
  taxRate: number; // 0.1 for 10%
  currency: string;
  discount: number; // Value (amount or rate depending on type)
  discountType: 'amount' | 'rate'; // Type of discount
  logo: string | null; // Base64 data URL
  seal: string | null; // Base64 data URL for the stamp
  tableStyle: TableStyle;
  styleConfig: StyleConfig;
}