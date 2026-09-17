export interface AuthenticatedDevice {
  deviceId: string;
  organizationId: string;
  deviceUid: string;
  driverId: string | null;
  vehicleId: string | null;
}
