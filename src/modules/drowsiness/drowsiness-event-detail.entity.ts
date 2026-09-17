import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'drowsiness_event_details' })
@Index('idx_drowsiness_details_event_id', ['safetyEventId'])
@Index('uq_drowsiness_details_event_id', ['safetyEventId'], { unique: true })
export class DrowsinessEventDetailEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'safety_event_id', type: 'uuid' })
  safetyEventId!: string;

  @Column({ name: 'eye_aspect_ratio', type: 'real', nullable: true })
  eyeAspectRatio!: number | null;

  @Column({ name: 'mouth_aspect_ratio', type: 'real', nullable: true })
  mouthAspectRatio!: number | null;

  @Column({ name: 'perclos_percent', type: 'real', nullable: true })
  perclosPercent!: number | null;

  @Column({ name: 'blink_rate_per_minute', type: 'real', nullable: true })
  blinkRatePerMinute!: number | null;

  @Column({ name: 'eye_closure_duration_ms', type: 'integer', nullable: true })
  eyeClosureDurationMs!: number | null;

  @Column({ type: 'boolean', nullable: true })
  yawning!: boolean | null;

  @Column({ name: 'yawn_duration_ms', type: 'integer', nullable: true })
  yawnDurationMs!: number | null;

  @Column({ name: 'head_pitch_deg', type: 'real', nullable: true })
  headPitchDeg!: number | null;

  @Column({ name: 'head_yaw_deg', type: 'real', nullable: true })
  headYawDeg!: number | null;

  @Column({ name: 'head_roll_deg', type: 'real', nullable: true })
  headRollDeg!: number | null;

  @Column({ name: 'face_detected', type: 'boolean', nullable: true })
  faceDetected!: boolean | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
