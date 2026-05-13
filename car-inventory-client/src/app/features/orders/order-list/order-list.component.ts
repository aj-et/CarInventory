import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService, Order } from '../../../core/services/order.service';
import { SignalrService } from '../../../core/services/signalr.service';
import { AuthService } from '../../../core/services/auth.service';
import { OrderFormComponent } from '../order-form/order-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, OrderFormComponent, ConfirmDialogComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Orders</h1>
          <p>{{ orders().length }} total orders</p>
        </div>
        <button class="btn-primary" (click)="showForm.set(true)">+ New Order</button>
      </div>

      @if (showForm()) {
        <app-order-form
          (saved)="onOrderSaved()"
          (cancelled)="showForm.set(false)" />
      }

      @if (orderToDelete()) {
        <app-confirm-dialog
          title="Delete Order?"
          [message]="'Are you sure you want to delete Order #' + orderToDelete()!.id + '? The vehicle will be released back to Available.'"
          confirmLabel="Yes, Delete"
          (confirmed)="confirmDeleteOrder()"
          (cancelled)="orderToDelete.set(null)" />
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
                    <div class="action-buttons">
                      @if (order.status < 3) {
                        <button class="btn-advance" (click)="advanceStatus(order)">
                          Advance →
                        </button>
                        <button class="btn-lost" (click)="markLost(order)">
                          Lost
                        </button>
                      }
                      @if (order.status === 3 || order.status === 4) {
                        <span class="closed-label">
                          {{ order.status === 3 ? '✅ Closed' : '❌ Lost' }}
                        </span>
                      }
                      <button
                        class="btn-delete"
                        [class.disabled]="authService.currentUser()?.role !== 'Admin'"
                        (click)="authService.currentUser()?.role === 'Admin' ? orderToDelete.set(order) : null"
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
    .mono { font-family: monospace; color: #94a3b8; }
    .notes { color: #64748b; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .date { color: #64748b; font-size: 0.8rem; }
    .badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge.inquiry { background: #1e3a5f; color: #38bdf8; }
    .badge.negotiation { background: #451a03; color: #f59e0b; }
    .badge.financing { background: #1a2e05; color: #84cc16; }
    .badge.closed { background: #052e16; color: #22c55e; }
    .badge.lost { background: #1c1917; color: #78716c; }
    .action-buttons { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .btn-advance { background: #38bdf8; color: #0f172a; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; }
    .btn-lost { background: transparent; color: #64748b; border: 1px solid #334155; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; }
    .btn-lost:hover { background: #1c1917; color: #f87171; border-color: #ef4444; }
    .btn-delete { background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; transition: all 0.2s; }
    .btn-delete:hover { background: #ef4444; color: white; }
    .closed-label { font-size: 0.75rem; color: #64748b; }
    .loading, .empty { padding: 3rem; text-align: center; color: #64748b; }
    .btn-delete.disabled { opacity: 0.4; cursor: not-allowed; border-color: #475569; color: #475569; position: relative; }
    .btn-delete.disabled:hover { background: transparent; color: #475569; }
    .btn-delete[data-tooltip] { position: relative; }
    .btn-delete[data-tooltip]:hover::after { content: attr(data-tooltip); position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: #0f172a; color: #e2e8f0; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.75rem; white-space: nowrap; border: 1px solid #334155; pointer-events: none; z-index: 10; }
    .btn-delete[data-tooltip]:hover::before { content: ''; position: absolute; bottom: calc(100% + 1px); left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #334155; pointer-events: none; z-index: 10; }
  `]
})
export class OrderListComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);
  showForm = signal(false);
  orderToDelete = signal<Order | null>(null);
  activeFilter = signal<number | 'all'>('all');

  filters = [
    { label: 'All', value: 'all' as const },
    { label: '📋 Inquiry', value: 0 },
    { label: '🤝 Negotiation', value: 1 },
    { label: '💳 Financing', value: 2 },
    { label: '✅ Closed', value: 3 },
    { label: '❌ Lost', value: 4 }
  ];

  filteredOrders = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.orders();
    return this.orders().filter(o => o.status === filter);
  });

  constructor(
    private orderService: OrderService,
    private signalrService: SignalrService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadOrders();
    this.listenToSignalR();
  }

  loadOrders() {
    this.loading.set(true);
    this.orderService.getAll().subscribe({
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

  onOrderSaved() {
    this.showForm.set(false);
  }

  advanceStatus(order: Order) {
    this.orderService.updateStatus(order.id, order.status + 1).subscribe({
      next: () => this.loadOrders()
    });
  }

  markLost(order: Order) {
    this.orderService.updateStatus(order.id, 4).subscribe({
      next: () => this.loadOrders()
    });
  }

  confirmDeleteOrder() {
    const order = this.orderToDelete();
    if (!order) return;
    this.orderService.delete(order.id).subscribe({
      next: () => {
        this.orderToDelete.set(null);
        this.loadOrders();
      },
      error: (err) => {
        alert(err.error || 'Failed to delete order.');
        this.orderToDelete.set(null);
      }
    });
  }

  getStatusLabel(status: number): string {
    return ['Inquiry', 'Negotiation', 'Financing', 'Closed', 'Lost'][status] ?? 'Unknown';
  }

  getStatusClass(status: number): string {
    return ['inquiry', 'negotiation', 'financing', 'closed', 'lost'][status] ?? '';
  }
}
