/** Administrative names come from the host app; this component owns no region dataset. */
export interface MobileCityOption {
  id: string
  name: string
  provinceId: string
  province: string
}
export interface MobileDistrictOption extends MobileCityOption {
  cityId: string
  city: string
}
