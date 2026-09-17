import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthenticatedDevice } from '../../common/auth/authenticated-device.interface';
import {
  AssignmentStatus,
  DeviceStatus,
  DriverStatus,
  TripStatus,
  VehicleStatus,
} from '../../common/enums/domain.enums';
import { AssignmentEntity } from '../assignments/assignment.entity';
import { DeviceEntity } from '../devices/device.entity';
import { DevicesService } from '../devices/devices.service';
import { DriverEntity } from '../drivers/driver.entity';
import { FleetEntity } from '../fleets/fleet.entity';
import { TripEntity } from '../trips/trip.entity';
import { TripsService } from '../trips/trips.service';
import { VehicleEntity } from '../vehicles/vehicle.entity';
import { CompleteDeviceTripDto } from './dto/complete-device-trip.dto';
import { StartDeviceTripDto } from './dto/start-device-trip.dto';

@Injectable()
export class DeviceRuntimeService {
  constructor(
    @InjectRepository(DeviceEntity)
    private readonly devices: Repository<DeviceEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignments: Repository<AssignmentEntity>,
    @InjectRepository(DriverEntity)
    private readonly drivers: Repository<DriverEntity>,
    @InjectRepository(VehicleEntity)
    private readonly vehicles: Repository<VehicleEntity>,
    @InjectRepository(FleetEntity)
    private readonly fleets: Repository<FleetEntity>,
    @InjectRepository(TripEntity)
    private readonly trips: Repository<TripEntity>,
    private readonly devicesService: DevicesService,
    private readonly tripsService: TripsService,
  ) {}

  async getContext(authenticated: AuthenticatedDevice) {
    const runtime = await this.resolveRuntime(authenticated);
    await this.devicesService.touchDevice(authenticated.deviceId);

    const canStartTrip =
      !runtime.activeTrip &&
      runtime.driver?.status === DriverStatus.ACTIVE &&
      runtime.vehicle?.status === VehicleStatus.ACTIVE;

    const requiredActions: string[] = [];
    if (!runtime.driver) requiredActions.push('BIND_DRIVER');
    if (!runtime.vehicle) requiredActions.push('BIND_VEHICLE');
    if (runtime.driver && runtime.driver.status !== DriverStatus.ACTIVE) {
      requiredActions.push('ACTIVATE_DRIVER');
    }
    if (runtime.vehicle && runtime.vehicle.status !== VehicleStatus.ACTIVE) {
      requiredActions.push('ACTIVATE_VEHICLE');
    }

    return {
      device: {
        id: runtime.device.id,
        deviceUid: runtime.device.deviceUid,
        platform: runtime.device.platform,
        status: runtime.device.status,
        appVersion: runtime.device.appVersion,
        modelVersion: runtime.device.modelVersion,
        lastSeenAt: new Date(),
      },
      bindingSource: runtime.bindingSource,
      assignment: runtime.assignment
        ? {
            id: runtime.assignment.id,
            startedAt: runtime.assignment.startedAt,
            status: runtime.assignment.status,
          }
        : null,
      driver: runtime.driver
        ? {
            id: runtime.driver.id,
            employeeCode: runtime.driver.employeeCode,
            fullName: runtime.driver.fullName,
            status: runtime.driver.status,
          }
        : null,
      vehicle: runtime.vehicle
        ? {
            id: runtime.vehicle.id,
            plateNumber: runtime.vehicle.plateNumber,
            make: runtime.vehicle.make,
            model: runtime.vehicle.model,
            fleetId: runtime.vehicle.fleetId,
            status: runtime.vehicle.status,
          }
        : null,
      fleet: runtime.fleet
        ? {
            id: runtime.fleet.id,
            code: runtime.fleet.code,
            name: runtime.fleet.name,
            status: runtime.fleet.status,
          }
        : null,
      activeTrip: runtime.activeTrip
        ? {
            id: runtime.activeTrip.id,
            clientTripId: runtime.activeTrip.clientTripId,
            startedAt: runtime.activeTrip.startedAt,
            status: runtime.activeTrip.status,
          }
        : null,
      canStartTrip,
      requiredActions,
    };
  }

  async startTrip(authenticated: AuthenticatedDevice, dto: StartDeviceTripDto) {
    const existing = await this.trips.findOne({
      where: {
        organizationId: authenticated.organizationId,
        clientTripId: dto.clientTripId,
      },
    });

    if (existing) {
      if (existing.deviceId !== authenticated.deviceId) {
        throw new ConflictException('clientTripId is already owned by another device');
      }
      return existing;
    }

    const runtime = await this.resolveRuntime(authenticated);
    if (runtime.activeTrip) {
      throw new ConflictException('Device already has an active trip');
    }
    if (!runtime.driver || runtime.driver.status !== DriverStatus.ACTIVE) {
      throw new ConflictException('Device is not bound to an active driver');
    }
    if (!runtime.vehicle || runtime.vehicle.status !== VehicleStatus.ACTIVE) {
      throw new ConflictException('Device is not bound to an active vehicle');
    }

    const trip = await this.tripsService.start(authenticated.organizationId, {
      driverId: runtime.driver.id,
      vehicleId: runtime.vehicle.id,
      fleetId: runtime.vehicle.fleetId ?? undefined,
      deviceId: authenticated.deviceId,
      assignmentId: runtime.assignment?.id,
      clientTripId: dto.clientTripId,
      startedAt: dto.startedAt,
    });

    await this.devicesService.touchDevice(authenticated.deviceId);
    return trip;
  }

  async completeTrip(
    authenticated: AuthenticatedDevice,
    tripId: string,
    dto: CompleteDeviceTripDto,
  ) {
    const trip = await this.trips.findOne({
      where: {
        id: tripId,
        organizationId: authenticated.organizationId,
      },
    });

    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.deviceId !== authenticated.deviceId) {
      throw new ConflictException('Trip is not owned by this device');
    }

    const completed = await this.tripsService.complete(
      authenticated.organizationId,
      tripId,
      dto.endedAt,
    );
    await this.devicesService.touchDevice(authenticated.deviceId);
    return completed;
  }

  private async resolveRuntime(authenticated: AuthenticatedDevice) {
    const device = await this.devices.findOne({
      where: {
        id: authenticated.deviceId,
        organizationId: authenticated.organizationId,
      },
    });
    if (!device || device.status !== DeviceStatus.ACTIVE) {
      throw new NotFoundException('Active device not found');
    }

    const activeTrip = await this.trips.findOne({
      where: {
        organizationId: authenticated.organizationId,
        deviceId: authenticated.deviceId,
        status: TripStatus.ACTIVE,
      },
      order: { startedAt: 'DESC' },
    });

    let assignment: AssignmentEntity | null = null;
    if (activeTrip?.assignmentId) {
      assignment = await this.assignments.findOne({
        where: {
          id: activeTrip.assignmentId,
          organizationId: authenticated.organizationId,
        },
      });
    }
    if (!assignment) {
      assignment = await this.assignments.findOne({
        where: {
          organizationId: authenticated.organizationId,
          deviceId: authenticated.deviceId,
          status: AssignmentStatus.ACTIVE,
        },
        order: { startedAt: 'DESC' },
      });
    }

    const driverId = activeTrip?.driverId ?? assignment?.driverId ?? device.driverId;
    const vehicleId = activeTrip?.vehicleId ?? assignment?.vehicleId ?? device.vehicleId;

    const driver = driverId
      ? await this.drivers.findOne({
          where: { id: driverId, organizationId: authenticated.organizationId },
        })
      : null;
    const vehicle = vehicleId
      ? await this.vehicles.findOne({
          where: { id: vehicleId, organizationId: authenticated.organizationId },
        })
      : null;
    const fleetId = activeTrip?.fleetId ?? vehicle?.fleetId ?? null;
    const fleet = fleetId
      ? await this.fleets.findOne({
          where: { id: fleetId, organizationId: authenticated.organizationId },
        })
      : null;

    const bindingSource = activeTrip
      ? 'ACTIVE_TRIP'
      : assignment
        ? 'ASSIGNMENT'
        : driver || vehicle
          ? 'DEVICE'
          : 'UNASSIGNED';

    return {
      device,
      assignment,
      driver,
      vehicle,
      fleet,
      activeTrip,
      bindingSource,
    };
  }
}
