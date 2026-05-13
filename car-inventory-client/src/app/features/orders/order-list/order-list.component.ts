import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SignalrService } from '../../../core/services/signalr.service';

interface Order {
  id: number;
  vehicleId: number;
  customerId: number;
  status: number;
  notes: string;
  createdAt: string;
  closedAt: string | null;
  vehicle: any;
  customer: any;
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Orders</h1>
          <p>{{ orders().length }} total orders</p>
        </div>
      </div>

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

      <div class="table-container">
        @if (loading()) {
          <div class="loading">Loading orders...</div>
        } @else if (filteredOrders().length === 0) {
          <div class="empty">No orders found.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Vehicle</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (order of filteredOrders(); track order.id) {
                <tr>
                  <td class="mono">#{{ order.id }}</td>
                  <td class="vehicle-name">
                    {{ order.vehicle?.year }} {{ order.vehicle?.make }} {{ order.vehicle?.model }}
                  </td>
                  <td>{{ order.customer?.firstName }} {{ order.customer?.lastName }}</td>
                  <td>
                    <span class="badge" [class]="getStatusClass(order.status)">
                      {{ getStatusLabel(order.status) }}
                    </span>
                  </td>
                  <td class="notes">{{ order.notes || '—' }}</td>
                  <td class="date">{{ order.createdAt | date:'shortDate' }}</td>
                  <td>
                    @if (order.status < 3) {
                      <div class="action-buttons">
                        <button class="btn-advance" (click)="advanceStatus(order)">
                          Advance →
                        </button>
                        <button class="btn-lost" (click)="markLost(order)">
                          Lost
                        </button>
                      </div>
                    }
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
    .mono { font-family: monospace; color: #94a3b8; }
    .notes { color: #64748b; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .date { color: #64748b; font-size: 0.8rem; }
    .badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge.inquiry { background: #1e3a5f; color: #38bdf8; }
    .badge.negotiation { background: #451a03; color: #f59e0b; }
    .badge.financing { background: #1a2e05; color: #84cc16; }
    .badge.closed { background: #052e16; color: #22c55e; }
    .badge.lost { background: #1c1917; color: #78716c; }
    .action-buttons { display: flex; gap: 0.5rem; }
    .btn-advance { background: #38bdf8; color: #0f172a; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; }
    .btn-lost { background: transparent; color: #64748b; border: 1px solid #334155; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; }
    .btn-lost:hover { background: #1c1917; color: #f87171; border-color: #ef4444; }
    .loading, .empty { padding: 3rem; text-align: center; color: #64748b; }
  `]
})
export class OrderListComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);
  activeFilter = signal<number | 'all'>('all');

  filters = [
    { label: 'All', value: 'all' as const },
    { label: '📋 Inquiry', value: 0 },
    { label: '🤝 Negotiation', value: 1 },
    { label: '💳 Financing', value: 2 },
    { label: '✅ Closed', value: 3 },
    { label: '❌ Lost', value: 4 }
  ];

  private apiUrl = 'http://localhost:5219/api/orders';

  constructor(
    private http: HttpClient,
    private signalrService: SignalrService
  ) {}

  ngOnInit() {
    this.loadOrders();
    this.listenToSignalR();
  }

  loadOrders() {
    this.loading.set(true);
    this.http.get<Order[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.orders.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  listenToSignalR() {
    const hub = this.signalrService['hubConnection'];
    if (hub) {
      hub.on('OrderCreated', () => this.loadOrders());
      hub.on('OrderUpdated', () => this.loadOrders());
      hub.on('OrderDeleted', () => this.loadOrders());
    }
  }

  advanceStatus(order: Order) {
    const nextStatus = order.status + 1;
    this.http.put(`${this.apiUrl}/${order.id}/status`, nextStatus, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe({
      next: () => this.loadOrders()
    });
  }

  markLost(order: Order) {
    this.http.put(`${this.apiUrl}/${order.id}/status`, 4, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe({
      next: () => this.loadOrders()
    });
  }

  filteredOrders() {
    const filter = this.activeFilter();
    if (filter === 'all') return this.orders();
    return this.orders().filter(o => o.status === filter);
  }

  getStatusLabel(status: number): string {
    return ['Inquiry', 'Negotiation', 'Financing', 'Closed', 'Lost'][status] ?? 'Unknown';
  }

  getStatusClass(status: number): string {
    return ['inquiry', 'negotiation', 'financing', 'closed', 'lost'][status] ?? '';
  }
}
