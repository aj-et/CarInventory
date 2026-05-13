import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface VehicleStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  inService: number;
}

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private hubConnection?: signalR.HubConnection;

  stats = signal<VehicleStats>({ total: 0, available: 0, reserved: 0, sold: 0, inService: 0 });
  lastEvent = signal<string>('');

  constructor(private authService: AuthService) {}

  startConnection() {
    const token = this.authService.getToken();

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        accessTokenFactory: () => token ?? ''
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => console.log('SignalR connected'))
      .catch(err => console.error('SignalR error:', err));

    this.hubConnection.on('StatsUpdated', (stats: VehicleStats) => {
      this.stats.set(stats);
    });

    this.hubConnection.on('VehicleAdded', (vehicle: any) => {
      this.lastEvent.set(`New vehicle added: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    });

    this.hubConnection.on('VehicleUpdated', (vehicle: any) => {
      this.lastEvent.set(`Vehicle updated: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    });

    this.hubConnection.on('OrderCreated', (order: any) => {
      this.lastEvent.set(`New order created: #${order.id}`);
    });
  }

  stopConnection() {
    this.hubConnection?.stop();
  }

  getHubConnection() {
    return this.hubConnection;
  }
}
