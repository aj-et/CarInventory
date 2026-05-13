import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VehicleService, Vehicle } from '../../../core/services/vehicle.service';
import { SignalrService } from '../../../core/services/signalr.service';
import { AuthService } from '../../../core/services/auth.service';
import { VehicleFormComponent } from '../vehicle-form/vehicle-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, RouterLink, VehicleFormComponent, ConfirmDialogComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Vehicles</h1>
          <p>{{ vehicles().length }} vehicles in inventory</p>
        </div>
        <button class="btn-primary" (click)="openAddForm()">+ Add Vehicle</button>
      </div>

      @if (showForm()) {
        <app-vehicle-form
          [editVehicle]="selectedVehicle()"
          (saved)="onVehicleSaved()"
          (cancelled)="closeForm()" />
      }

      @if (vehicleToDelete()) {
        <app-confirm-dialog
          title="Delete Vehicle?"
          [message]="'Are you sure you want to delete ' + vehicleToDelete()!.year + ' ' + vehicleToDelete()!.make + ' ' + vehicleToDelete()!.model + '? This cannot be undone.'"
          confirmLabel="Yes, Delete"
          (confirmed)="confirmDeleteVehicle()"
          (cancelled)="vehicleToDelete.set(null)" />
      }

      <div class="filters">
        @for (filter of filters; track filter.value) {
          <button
            class="filter-btn"
            [class.active]="activeFilter() === filter.value"
            (click)="activeFilter.set(filter.value)">
            {{ filter.label }}
          </button>
        }
      </div>

      <div class="table-container">
        @if (loading()) {
          <div class="loading">Loading vehicles...</div>
        } @else if (filteredVehicles().length === 0) {
          <div class="empty">No vehicles found.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Year / Make / Model</th>
                <th>VIN</th>
                <th>Stock #</th>
                <th>Color</th>
                <th>Mileage</th>
                <th>Selling Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (vehicle of filteredVehicles(); track vehicle.id) {
                <tr>
                  <td class="vehicle-name">
                    {{ vehicle.year }} {{ vehicle.make }} {{ vehicle.model }}
                    <span class="trim">{{ vehicle.trim }}</span>
                  </td>
                  <td class="mono">{{ vehicle.vin }}</td>
                  <td class="mono">{{ vehicle.stockNumber }}</td>
                  <td>{{ vehicle.color }}</td>
                  <td>{{ vehicle.mileage | number }} mi</td>
                  <td class="price">\${{ vehicle.sellingPrice | number:'1.0-0' }}</td>
                  <td>
                    <span class="badge" [class]="getStatusClass(vehicle.status)">
                      {{ getStatusLabel(vehicle.status) }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-edit" (click)="openEditForm(vehicle)">Edit</button>
                      <button
                        class="btn-delete"
                        [class.disabled]="authService.currentUser()?.role !== 'Admin'"
                        (click)="authService.currentUser()?.role === 'Admin' ? vehicleToDelete.set(vehicle) : null"
                        [attr.data-tooltip]="authService.currentUser()?.role !== 'Admin' ? 'Contact an admin to delete' : null">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 700; color: #f1f5f9; margin: 0 0 0.25rem; }
    .page-header p { color: #94a3b8; margin: 0; }
    .btn-primary { background: #38bdf8; color: #0f172a; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.875rem; }
    .filters { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .filter-btn { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; transition: all 0.2s; }
    .filter-btn.active, .filter-btn:hover { background: #38bdf8; color: #0f172a; border-color: #38bdf8; }
    .table-container { background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: #0f172a; }
    th { padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    td { padding: 1rem; border-top: 1px solid #334155; font-size: 0.875rem; color: #cbd5e1; }
    tr:hover td { background: #263548; }
    .vehicle-name { color: #f1f5f9; font-weight: 500; }
    .trim { display: block; font-size: 0.75rem; color: #64748b; font-weight: 400; }
    .mono { font-family: monospace; font-size: 0.8rem; color: #94a3b8; }
    .price { color: #22c55e; font-weight: 600; }
    .badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge.available { background: #052e16; color: #22c55e; }
    .badge.reserved { background: #451a03; color: #f59e0b; }
    .badge.sold { background: #2e1065; color: #a855f7; }
    .badge.inservice { background: #0c1a2e; color: #38bdf8; }
    .action-buttons { display: flex; gap: 0.5rem; }
    .btn-edit { background: transparent; color: #38bdf8; border: 1px solid #38bdf8; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; transition: all 0.2s; }
    .btn-edit:hover { background: #38bdf8; color: #0f172a; }
    .btn-delete { background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; transition: all 0.2s; }
    .btn-delete:hover { background: #ef4444; color: white; }
    .loading, .empty { padding: 3rem; text-align: center; color: #64748b; }
    .btn-delete.disabled { opacity: 0.4; cursor: not-allowed; border-color: #475569; color: #475569; position: relative; }
    .btn-delete.disabled:hover { background: transparent; color: #475569; }
    .btn-delete[data-tooltip] { position: relative; }
    .btn-delete[data-tooltip]:hover::after { content: attr(data-tooltip); position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: #0f172a; color: #e2e8f0; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.75rem; white-space: nowrap; border: 1px solid #334155; pointer-events: none; z-index: 10; }
    .btn-delete[data-tooltip]:hover::before { content: ''; position: absolute; bottom: calc(100% + 1px); left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #334155; pointer-events: none; z-index: 10; }
  `]
})
export class VehicleListComponent implements OnInit {
  vehicles = signal<Vehicle[]>([]);
  loading = signal(true);
  showForm = signal(false);
  selectedVehicle = signal<Vehicle | null>(null);
  vehicleToDelete = signal<Vehicle | null>(null);
  activeFilter = signal<number | 'all'>('all');

  filters = [
    { label: 'All', value: 'all' as const },
    { label: '✅ Available', value: 0 },
    { label: '🔒 Reserved', value: 1 },
    { label: '💰 Sold', value: 2 },
    { label: '🔧 In Service', value: 3 }
  ];

  filteredVehicles = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.vehicles();
    return this.vehicles().filter(v => v.status === filter);
  });

  constructor(
    private vehicleService: VehicleService,
    private signalrService: SignalrService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadVehicles();
    this.listenToSignalR();
  }

  loadVehicles() {
    this.loading.set(true);
    this.vehicleService.getAll().subscribe({
      next: (data) => {
        this.vehicles.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  listenToSignalR() {
    const hub = this.signalrService['hubConnection'];
    if (hub) {
      hub.on('VehicleAdded', () => this.loadVehicles());
      hub.on('VehicleUpdated', () => this.loadVehicles());
      hub.on('VehicleDeleted', () => this.loadVehicles());
    }
  }

  openAddForm() {
    this.selectedVehicle.set(null);
    this.showForm.set(true);
  }

  openEditForm(vehicle: Vehicle) {
    this.selectedVehicle.set(vehicle);
    this.showForm.set(true);
  }

  closeForm() {
    this.selectedVehicle.set(null);
    this.showForm.set(false);
  }

  onVehicleSaved() {
    this.closeForm();
  }

  confirmDeleteVehicle() {
    const vehicle = this.vehicleToDelete();
    if (!vehicle) return;
    this.vehicleService.delete(vehicle.id).subscribe({
      next: () => {
        this.vehicleToDelete.set(null);
        this.loadVehicles();
      },
      error: (err) => {
        alert(err.error || 'Failed to delete vehicle.');
        this.vehicleToDelete.set(null);
      }
    });
  }

  getStatusLabel(status: number): string {
    return ['Available', 'Reserved', 'Sold', 'In Service'][status] ?? 'Unknown';
  }

  getStatusClass(status: number): string {
    return ['available', 'reserved', 'sold', 'inservice'][status] ?? '';
  }
}
