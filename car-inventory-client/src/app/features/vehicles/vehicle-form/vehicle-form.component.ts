import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VehicleService, Vehicle } from '../../../core/services/vehicle.service';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="modal-overlay" (click)="cancelled.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ editVehicle ? 'Edit Vehicle' : 'Add New Vehicle' }}</h2>
          <button class="close-btn" (click)="cancelled.emit()">✕</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-grid">
            <div class="form-group">
              <label>Make</label>
              <input type="text" formControlName="make" placeholder="Toyota" />
            </div>
            <div class="form-group">
              <label>Model</label>
              <input type="text" formControlName="model" placeholder="Camry" />
            </div>
            <div class="form-group">
              <label>Year</label>
              <input type="number" formControlName="year" placeholder="2024" />
            </div>
            <div class="form-group">
              <label>Trim</label>
              <input type="text" formControlName="trim" placeholder="XSE" />
            </div>
            <div class="form-group">
              <label>Color</label>
              <input type="text" formControlName="color" placeholder="Midnight Black" />
            </div>
            <div class="form-group">
              <label>Mileage</label>
              <input type="number" formControlName="mileage" placeholder="0" />
            </div>
            <div class="form-group">
              <label>VIN</label>
              <input type="text" formControlName="vin" placeholder="1HGBH41JXMN109186" />
            </div>
            <div class="form-group">
              <label>Stock Number</label>
              <input type="text" formControlName="stockNumber" placeholder="STK-001" />
            </div>
            <div class="form-group">
              <label>MSRP ($)</label>
              <input type="number" formControlName="msrp" placeholder="30000" />
            </div>
            <div class="form-group">
              <label>Selling Price ($)</label>
              <input type="number" formControlName="sellingPrice" placeholder="28000" />
            </div>
            @if (editVehicle) {
              <div class="form-group">
                <label>Status</label>
                <select formControlName="status">
                  <option [value]="0">Available</option>
                  <option [value]="1">Reserved</option>
                  <option [value]="2">Sold</option>
                  <option [value]="3">In Service</option>
                </select>
              </div>
            }
          </div>

          @if (errorMessage) {
            <div class="alert-error">{{ errorMessage }}</div>
          }

          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="cancelled.emit()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
              {{ loading ? 'Saving...' : editVehicle ? 'Save Changes' : 'Add Vehicle' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1rem; }
    .modal { background: #1e293b; border-radius: 12px; width: 100%; max-width: 640px; border: 1px solid #334155; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #334155; position: sticky; top: 0; background: #1e293b; }
    .modal-header h2 { font-size: 1.25rem; font-weight: 600; color: #f1f5f9; margin: 0; }
    .close-btn { background: none; border: none; color: #64748b; font-size: 1.25rem; cursor: pointer; padding: 0.25rem; }
    .close-btn:hover { color: #f1f5f9; }
    form { padding: 1.5rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    label { font-size: 0.8rem; color: #94a3b8; }
    input, select { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 0.65rem 0.875rem; color: #e2e8f0; font-size: 0.875rem; outline: none; transition: border-color 0.2s; }
    input:focus, select:focus { border-color: #38bdf8; }
    select option { background: #0f172a; }
    .alert-error { background: #450a0a; border: 1px solid #ef4444; color: #f87171; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-primary { background: #38bdf8; color: #0f172a; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.875rem; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: transparent; color: #94a3b8; border: 1px solid #334155; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.875rem; }
    .btn-secondary:hover { background: #334155; }
  `]
})
export class VehicleFormComponent implements OnInit {
  @Input() editVehicle: Vehicle | null = null;
  @Output() saved = new EventEmitter<Vehicle>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(private fb: FormBuilder, private vehicleService: VehicleService) {
    this.form = this.fb.group({
      make: ['', Validators.required],
      model: ['', Validators.required],
      year: ['', [Validators.required, Validators.min(1900), Validators.max(2030)]],
      trim: [''],
      color: ['', Validators.required],
      mileage: [0, Validators.required],
      vin: ['', Validators.required],
      stockNumber: ['', Validators.required],
      msrp: ['', Validators.required],
      sellingPrice: ['', Validators.required],
      status: [0]
    });
  }

  ngOnInit() {
    if (this.editVehicle) {
      this.form.patchValue(this.editVehicle);
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    if (this.editVehicle) {
      const updated = { ...this.editVehicle, ...this.form.value };
      this.vehicleService.update(this.editVehicle.id, updated).subscribe({
        next: () => {
          this.saved.emit(updated);
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error || 'Failed to update vehicle.';
          this.loading = false;
        }
      });
    } else {
      this.vehicleService.create(this.form.value).subscribe({
        next: (vehicle) => {
          this.saved.emit(vehicle);
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error || 'Failed to add vehicle.';
          this.loading = false;
        }
      });
    }
  }
}
