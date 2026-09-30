export type BranchOverview = {
  /** Owner user id; staff log in with it as "İşletme ID". */
  merchantId: number;
  photoUrl: string | null;
  active: boolean;
  address: string | null;
  phone: string | null;
  email: string | null;
  kitchenOn: boolean;
  courierOn: boolean;
};
