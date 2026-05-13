import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { OrderService } from '../../../core/services/order.service';
import { Vehicle } from '../../../core/services/vehicle.service';

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="modal-overlay" (click)="cancelled.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Create New Order</h2>
          <button class="close-btn" (click)="cancelled.emit()">✕</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Vehicle</label>
            <select formControlName="vehicleId">
              <option value="">Select a vehicle...</option>
              @for (vehicle of availableVehicles; track vehicle.id) {
                <option [value]="vehicle.id">
                  {{ vehicle.year }} {{ vehicle.make }} {{ vehicle.model }} — {{ vehicle.color }} — \${{ vehicle.sellingPrice | number:'1.0-0' }}
                </option>
              }
            </select>
            @if (availableVehicles.length === 0) {
              <span class="hint">No available vehicles. Add vehicles first.</span>
            }
          </div>

          <div class="form-group">
            <label>Customer</label>
            <select formControlName="customerId">
              <option value="">Select a customer...</option>
              @for (customer of customers; track customer.id) {
                <option [value]="customer.id">
                  {{ customer.firstName }} {{ customer.lastName }} — {{ customer.email }}
                </option>
              }
            </select>
          </div>

          <!-- New Customer Section -->
          <div class="new-customer-toggle">
            <button type="button" class="btn-link" (click)="showNewCustomer = !showNewCustomer">
              {{ showNewCustomer ? '— Cancel new customer' : '+ Add new customer' }}
            </button>
          </div>

          @if (showNewCustomer) {
            <div class="new-customer-form" formGroupName="newCustomer">
              <h3>New Customer</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>First Name</label>
                  <input type="text" formControlName="firstName" placeholder="John" />
                </div>
                <div class="form-group">
                  <label>Last Name</label>
                  <input type="text" formControlName="lastName" placeholder="Smith" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" formControlName="email" placeholder="john@email.com" />
                </div>
                <div class="form-group">
                  <label>Phone</label>
                  <input type="text" formControlName="phone" placeholder="801-555-1234" />
                </div>
              </div>
              <button type="button" class="btn-secondary" (click)="createCustomer()" [disabled]="creatingCustomer">
                {{ creatingCustomer ? 'Creating...' : 'Create Customer' }}
              </button>
            </div>
          }

          <div class="form-group">
            <label>Notes (optional)</label>
            <textarea formControlName="notes" placeholder="Any notes about this deal..." rows="3"></textarea>
          </div>

          @if (errorMessage) {
            <div class="alert-error">{{ errorMessage }}</div>
          }

          @if (successMessage) {
            <div class="alert-success">{{ successMessage }}</div>
          }

          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="cancelled.emit()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
              {{ loading ? 'Creating...' : 'Create Order' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1rem; }
    .modal { background: #1e293b; border-radius: 12px; width: 100%; max-width: 560px; border: 1px solid #334155; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #334155; position: sticky; top: 0; background: #1e293b; z-index: 1; }
    .modal-header h2 { font-size: 1.25rem; font-weight: 600; color: #f1f5f9; margin: 0; }
    .close-btn { background: none; border: none; color: #64748b; font-size: 1.25rem; cursor: pointer; }
    .close-btn:hover { color: #f1f5f9; }
    form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    label { font-size: 0.8rem; color: #94a3b8; }
    input, select, textarea { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 0.65rem 0.875rem; color: #e2e8f0; font-size: 0.875rem; outline: none; transition: border-color 0.2s; width: 100%; box-sizing: border-box; }
    input:focus, select:focus, textarea:focus { border-color: #38bdf8; }
    select option { background: #0f172a; }
    textarea { resize: vertical; font-family: inherit; }
    .hint { font-size: 0.75rem; color: #f59e0b; }
    .new-customer-toggle { margin-top: -0.5rem; }
    .btn-link { background: none; border: none; color: #38bdf8; cursor: pointer; font-size: 0.875rem; padding: 0; }
    .btn-link:hover { text-decoration: underline; }
    .new-customer-form { background: #0f172a; border-radius: 8px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; border: 1px solid #334155; }
    .new-customer-form h3 { font-size: 0.875rem; font-weight: 600; color: #94a3b8; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
    .alert-error { background: #450a0a; border: 1px solid #ef4444; color: #f87171; padding: 0.75rem; border-radius: 8px; font-size: 0.875rem; }
    .alert-success { background: #052e16; border: 1px solid #22c55e; color: #22c55e; padding: 0.75rem; border-radius: 8px; font-size: 0.875rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.5rem; }
    .btn-primary { background: #38bdf8; color: #0f172a; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.875rem; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: transparent; color: #94a3b8; border: 1px solid #334155; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.875rem; }
    .btn-secondary:hover { background: #334155; }
  `]
})
export class OrderFormComponent implements OnInit {
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  loading = false;
  creatingCustomer = false;
  showNewCustomer = false;
  errorMessage = '';
  successMessage = '';
  availableVehicles: Vehicle[] = [];
  customers: Customer[] = [];

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      vehicleId: ['', Validators.required],
      customerId: ['', Validators.required],
      notes: [''],
      newCustomer: this.fb.group({
        firstName: [''],
        lastName: [''],
        email: [''],
        phone: ['']
      })
    });
  }

  ngOnInit() {
    this.loadVehicles();
    this.loadCustomers();
  }

  loadVehicles() {
    this.http.get<Vehicle[]>('http://localhost:5219/api/vehicles').subscribe(vehicles => {
      this.availableVehicles = vehicles.filter(v => v.status === 0);
    });
  }

  loadCustomers() {
    this.http.get<Customer[]>('http://localhost:5219/api/customers').subscribe(customers => {
      this.customers = customers;
    });
  }

  createCustomer() {
    const newCustomer = this.form.get('newCustomer')?.value;
    if (!newCustomer.firstName || !newCustomer.email) {
      this.errorMessage = 'First name and email are required for new customer.';
      return;
    }
    this.creatingCustomer = true;
    this.http.post<Customer>('http://localhost:5219/api/customers', newCustomer).subscribe({
      next: (customer) => {
        this.customers = [...this.customers, customer];
        this.form.patchValue({ customerId: customer.id });
        this.showNewCustomer = false;
        this.successMessage = `Customer ${customer.firstName} ${customer.lastName} created!`;
        this.creatingCustomer = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error || 'Failed to create customer.';
        this.creatingCustomer = false;
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    const dto = {
      vehicleId: Number(this.form.value.vehicleId),
      customerId: Number(this.form.value.customerId),
      notes: this.form.value.notes || null
    };

    this.orderService.create(dto).subscribe({
      next: () => {
        this.saved.emit();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error || 'Failed to create order.';
        this.loading = false;
      }
    });
  }
}
