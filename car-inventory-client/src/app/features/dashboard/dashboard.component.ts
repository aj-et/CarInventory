import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VehicleService } from '../../core/services/vehicle.service';
import { SignalrService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {{ authService.currentUser()?.email }}</p>
        </div>
        <a routerLink="/vehicles" class="btn-primary">+ Add Vehicle</a>
      </div>

      <!-- Live Stats -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">🚗</div>
          <div class="stat-info">
            <span class="stat-value">{{ signalrService.stats().total }}</span>
            <span class="stat-label">Total Vehicles</span>
          </div>
        </div>
        <div class="stat-card available">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <span class="stat-value">{{ signalrService.stats().available }}</span>
            <span class="stat-label">Available</span>
          </div>
        </div>
        <div class="stat-card reserved">
          <div class="stat-icon">🔒</div>
          <div class="stat-info">
            <span class="stat-value">{{ signalrService.stats().reserved }}</span>
            <span class="stat-label">Reserved</span>
          </div>
        </div>
        <div class="stat-card sold">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <span class="stat-value">{{ signalrService.stats().sold }}</span>
            <span class="stat-label">Sold</span>
          </div>
        </div>
      </div>

      <!-- Live Event Feed -->
      @if (signalrService.lastEvent()) {
        <div class="event-feed">
          <span class="live-dot"></span>
          <span>{{ signalrService.lastEvent() }}</span>
        </div>
      }

      <!-- Quick Links -->
      <div class="quick-links">
        <a routerLink="/vehicles" class="quick-card">
          <span class="quick-icon">🚘</span>
          <span class="quick-title">Manage Vehicles</span>
          <span class="quick-desc">Add, edit, and track inventory</span>
        </a>
        <a routerLink="/orders" class="quick-card">
          <span class="quick-icon">📋</span>
          <span class="quick-title">Manage Orders</span>
          <span class="quick-desc">Track deals and customer orders</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 700; color: #f1f5f9; margin: 0 0 0.25rem; }
    .page-header p { color: #94a3b8; margin: 0; }
    .btn-primary { background: #38bdf8; color: #0f172a; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; font-size: 0.875rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
    .stat-card { background: #1e293b; border-radius: 12px; padding: 1.5rem; display: flex; align-items: center; gap: 1rem; border-left: 4px solid transparent; }
    .stat-card.total { border-color: #38bdf8; }
    .stat-card.available { border-color: #22c55e; }
    .stat-card.reserved { border-color: #f59e0b; }
    .stat-card.sold { border-color: #a855f7; }
    .stat-icon { font-size: 2rem; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #f1f5f9; line-height: 1; }
    .stat-label { font-size: 0.875rem; color: #94a3b8; margin-top: 0.25rem; }
    .event-feed { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; color: #94a3b8; font-size: 0.875rem; }
    .live-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 1.5s infinite; flex-shrink: 0; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .quick-links { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
    .quick-card { background: #1e293b; border-radius: 12px; padding: 2rem; display: flex; flex-direction: column; gap: 0.5rem; text-decoration: none; transition: background 0.2s; border: 1px solid #334155; }
    .quick-card:hover { background: #263548; }
    .quick-icon { font-size: 2rem; }
    .quick-title { font-size: 1.125rem; font-weight: 600; color: #f1f5f9; }
    .quick-desc { font-size: 0.875rem; color: #94a3b8; }
  `]
})
export class DashboardComponent implements OnInit {
  constructor(
    public signalrService: SignalrService,
    public authService: AuthService,
    private vehicleService: VehicleService
  ) {}

  ngOnInit() {
    // Load initial stats
    this.vehicleService.getStats().subscribe(stats => {
      this.signalrService.stats.set(stats);
    });
  }
}
