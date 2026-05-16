import { type Product } from './data/products';

export interface CartItem extends Product {
  quantity: number;
  selectedColor?: string;
}

export interface User {
  id: string;
  name: string;
  role: 'master' | 'socio' | 'colaborador' | 'customer';
  password?: string;
  initials: string;
  heardFrom?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  storeName?: string;
  storeBio?: string;
  storeLogo?: string;
  storeBanner?: string;
  themeId?: string;
  customPrimary?: string;
  customBg?: string;
  customSurface?: string;
  storeCategories?: { id: string; name: string }[];
  storeTags?: string[];
  disabledDefaultCategories?: string[];
  isPremium?: boolean;
  parentStoreId?: string;
  status?: 'active' | 'blocked';
}

export interface SaleItem {
  productId: string;
  title: string;
  price: number;
  costPrice?: number;
  qty: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  subtotal: number;
  discount: number;
  discountAmount: number;
  paymentMethod: string;
  createdAt: any; // Timestamp or Date
  sellerId: string;
}

export interface Expense {
  id: string;
  label: string;
  amount: number;
  category: string;
  createdAt: any; // Timestamp or Date
  storeId: string;
}

export interface FixedExpense {
  id: string;
  label: string;
  amount: number;
  period: 'daily' | 'monthly';
  storeId: string;
}

