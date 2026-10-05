export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  attributes: {
    colors: string[];
    sizes: string[];
  };
  colorImages?: Record<string, string>;
  category: string;
  isFeatured?: boolean;
  createdAt: string;
  lastStockedAt?: string;
  rating?: number;
  ratingCount?: number;
}

export interface Rating {
  id: string;
  productId: string;
  value: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  productId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Stock {
  id: string;
  productId: string;
  variation: {
    color: string;
    size: string;
  };
  quantity: number;
  quantitiesByProvince?: {
    [province: string]: number;
  };
  lastUpdated: string;
}

export interface Sale {
  id: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerProvince?: string;
  customerNeighborhood?: string;
  customerAddress?: string;
  userId?: string;
  items: {
    productId: string;
    productName: string;
    variation: {
      color: string;
      size: string;
    };
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  paidAmount: number;
  status: 'paid' | 'pending' | 'cancelled';
  type: 'sale' | 'reservation';
  channel?: 'whatsapp' | 'sms';
  createdAt: string;
  paidAt?: string;
  archived?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalDebt: number;
}

export interface Debt {
  id: string;
  customerId: string;
  saleId: string;
  amount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'active' | 'paid';
  createdAt: string;
  paidAt?: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  variation: {
    color: string;
    size: string;
  };
  quantity: number;
  price: number;
  image: string;
}

export interface BannerSlide {
  id: string;
  tag?: string;
  title: string;
  highlightText?: string;
  subtitle: string;
  imageUrl?: string;
  productId?: string;
  buttonText?: string;
  gradient?: string;
}

export interface DiscountSettings {
  enabled: boolean;
  percentage: number;
  applyToAll: boolean;
  selectedProductIds: string[];
}

export interface SiteSettings {
  id: string;
  logoUrl: string;
  storeName: string;
  storeDescription: string;
  primaryColor: string;
  accentColor: string;
  borderRadius: string;
  fontFamily: string;
  whatsappNumber?: string;
  emailForNotifications?: string;
  adImageUrl?: string;
  showAd?: boolean;
  showBenefitsModal?: boolean;
  salesResetDate?: string;
  showcaseColor?: string;
  searchBarColor?: string;
  showcaseBorderColor?: string;
  searchBorderColor?: string;
  priceColor?: string;
  headerColor?: string;
  backgroundColor?: string;
  textColor?: string;
  bannerSlides?: BannerSlide[];
  discountSettings?: DiscountSettings;
  enableNotifications?: boolean;
  enableDelivery?: boolean;
  enableCashOnDelivery?: boolean;
}

export interface Stats {
  id: string;
  visitorCount: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  usageCount: number;
  productId?: string;
  createdAt: string;
}
