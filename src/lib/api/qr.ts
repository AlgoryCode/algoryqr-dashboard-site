export type QrRequestDetails =
  | {
      url: string;
    }
  | {
      ssid: string;
      password: string;
      security: "WPA" | "WEP" | "NONE";
    }
  | {
      mail: string;
      subject: string;
      body: string;
    }
  | {
      fullName: string;
      phone: string;
      mail: string;
      company: string;
      title: string;
    }
  | {
      text: string;
    }
  | {
      latitude: string;
      longitude: string;
      label: string;
    };

export interface CreateQrRequestBody {
  merchantId?: number | string;
  qrName: string;
  type: string;
  details: QrRequestDetails;
}

export interface QrResponse {
  id: string;
  qrName: string;
  type: string;
  details: QrRequestDetails;
  imgSrc: string;
  status: "active" | "inactive" | "draft";
  createdAt: string;
  updatedAt: string;
  scans: number;
}

export interface CreateQrResponse {
  qrResponse: QrResponse;
}

export interface UpdateQrRequestBody {
  merchantId?: number | string;
  qrName: string;
  type: string;
  details: QrRequestDetails;
}

export interface UpdateQrNameRequestBody {
  qrName: string;
}

export interface UserQrApiItem {
  qrId: number;
  merchantId?: number;
  qrName: string;
  imgSrc: string;
  details: Record<string, unknown>;
  createdAt: string;
  purchaseId?: number | null;
  packageName?: string | null;
  legacy?: boolean;
  activePackage?: boolean;
  active?: boolean;
  menuId?: number | null;
  publicUrl?: string | null;
  trackingEnabled?: boolean;
  totalScans?: number;
  dailyScans?: { date: string; count: number }[];
}

export type QrListScope = "ALL" | "CURRENT" | "LEGACY";

export interface UserQrPageApiResponse {
  content: UserQrApiItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface UpdateQrActiveRequestBody {
  active: boolean;
}

export interface UpdateQrActiveResponse {
  qrId: number;
  active: boolean;
}
