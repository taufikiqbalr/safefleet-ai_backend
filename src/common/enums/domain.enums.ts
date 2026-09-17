export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
}

export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum FleetStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REVOKED = 'REVOKED',
}

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export enum TripStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum SafetyEventType {
  DROWSINESS = 'DROWSINESS',
  CABIN_GAS = 'CABIN_GAS',
  DRIVER_DISTRACTION = 'DRIVER_DISTRACTION',
  DEVICE_HEALTH = 'DEVICE_HEALTH',
}

export enum SafetySeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
