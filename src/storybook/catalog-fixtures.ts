export function catalogPackages() {
  return [packageItem(2, "STARTER_PACKAGE", "Başlangıç", 499), packageItem(3, "ULTIMATE_PACKAGE", "Ultimate", 1499)];
}

export function catalogProducts() {
  return [
    {
      id: 1,
      code: "QR_MENU",
      name: "Ek menü",
      description: "Ek dijital menü hakkı",
      price: 199,
      unitPrice: 199,
      vatRate: 20,
      currency: "TRY",
      active: true,
    },
  ];
}

function packageItem(id: number, code: string, name: string, price: number) {
  return {
    id,
    code,
    name,
    description: `${name} paket`,
    features: [],
    price,
    yearlyPrice: price * 10,
    currency: "TRY",
    active: true,
    validityDays: 30,
    items: [],
    availableModules: [],
  };
}
