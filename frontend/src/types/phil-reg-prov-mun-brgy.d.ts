declare module 'phil-reg-prov-mun-brgy' {
  export const regions: Array<{ name: string; reg_code: string; [key: string]: any }>;
  export function getProvincesByRegion(regionCode: string): Array<{ name: string; prov_code: string; [key: string]: any }>;
  export function getCityMunByProvince(provinceCode: string): Array<{ name: string; mun_code: string; [key: string]: any }>;
  export function getBarangayByMun(munCode: string): Array<{ name: string; brgy_code: string; [key: string]: any }>;
}
