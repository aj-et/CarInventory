import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VehicleService, Vehicle } from '../../../core/services/vehicle.service';
import { SignalrService } from '../../../core/services/signalr.service';
import { VehicleFormComponent } from '../vehicle-form/vehicle-form.component';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, RouterLink, VehicleFormComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Vehicles</h1>
          <p>{{ vehicles().length }} vehicles in inventory</p>
        </div>
        <button class="btn-primary" (click)="showForm.set(true)">+ Add Vehicle</button>
      </div>

      <!-- Add Vehicle Form Modal -->
      @if (showForm()) {
        <app-vehicle-form
          (saved)="onVehicleSaved($event)"
          (cancelled)="showForm.set(false)" />
      }

      <!-- Status Filter -->
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

      <!-- Vehicle Table -->
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
    .loading, .empty { padding: 3rem; text-align: center; color: #64748b; }
  `]
})
export class VehicleListComponent implements OnInit {
  vehicles = signal<Vehicle[]>([]);
  loading = signal(true);
  showForm = signal(false);
  activeFilter = signal<number | 'all'>('all');

  filters = [
    { label: 'All', value: 'all' as const },
    { label: '✅ Available', value: 0 },
    { label: '🔒 Reserved', value: 1 },
    { label: '💰 Sold', value: 2 },
    { label: '🔧 In Service', value: 3 }
  ];

  constructor(
    private vehicleService: VehicleService,
    private signalrService: SignalrService
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
    // Refresh list when vehicles change in real time
    const hub = this.signalrService['hubConnection'];
    if (hub) {
      hub.on('VehicleAdded', () => this.loadVehicles());
      hub.on('VehicleUpdated', () => this.loadVehicles());
      hub.on('VehicleDeleted', () => this.loadVehicles());
    }
  }

  filteredVehicles = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.vehicles();
    return this.vehicles().filter(v => v.status === filter);
  });

  onVehicleSaved(vehicle: Vehicle) {
    // this.vehicles.update(list => [...list, vehicle]);
    this.showForm.set(false);
  }

  getStatusLabel(status: number): string {
    return ['Available', 'Reserved', 'Sold', 'In Service'][status] ?? 'Unknown';
  }

  getStatusClass(status: number): string {
    return ['available', 'reserved', 'sold', 'inservice'][status] ?? '';
  }
}
