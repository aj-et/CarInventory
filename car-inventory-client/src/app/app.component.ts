import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { SignalrService } from './core/services/signalr.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-container">
      @if (authService.isLoggedIn()) {
        <nav class="navbar">
          <div class="nav-brand">🚗 CarInventory</div>
          <div class="nav-links">
            <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
            <a routerLink="/vehicles" routerLinkActive="active">Vehicles</a>
            <a routerLink="/orders" routerLinkActive="active">Orders</a>
          </div>
          <div class="nav-user">
            <span>{{ authService.currentUser()?.email }}</span>
            <button (click)="logout()">Logout</button>
          </div>
        </nav>
        @if (signalrService.lastEvent()) {
          <div class="live-banner">
            🔴 LIVE: {{ signalrService.lastEvent() }}
          </div>
        }
      }
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-container { min-height: 100vh; background: #0f172a; color: #e2e8f0; }
    .navbar { display: flex; align-items: center; padding: 1rem 2rem; background: #1e293b; gap: 2rem; }
    .nav-brand { font-size: 1.25rem; font-weight: 700; color: #38bdf8; }
    .nav-links { display: flex; gap: 1.5rem; flex: 1; }
    .nav-links a { color: #94a3b8; text-decoration: none; transition: color 0.2s; }
    .nav-links a.active, .nav-links a:hover { color: #38bdf8; }
    .nav-user { display: flex; align-items: center; gap: 1rem; }
    .nav-user span { color: #94a3b8; font-size: 0.875rem; }
    .nav-user button { background: #ef4444; color: white; border: none; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; }
    .live-banner { background: #1e293b; border-left: 3px solid #ef4444; padding: 0.5rem 2rem; font-size: 0.875rem; color: #f87171; }
    main { padding: 2rem; }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    public authService: AuthService,
    public signalrService: SignalrService
  ) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.signalrService.startConnection();
    }
  }

  ngOnDestroy() {
    this.signalrService.stopConnection();
  }

  logout() {
    this.signalrService.stopConnection();
    this.authService.logout();
  }
}
