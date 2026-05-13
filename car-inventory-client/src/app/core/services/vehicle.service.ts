import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Vehicle {
  id: number;
  vin: string;
  stockNumber: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  color: string;
  mileage: number;
  msrp: number;
  sellingPrice: number;
  status: number;
  createdAt: string;
}

export interface VehicleStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  inService: number;
}

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private apiUrl = `${environment.apiUrl}/api/vehicles`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Vehicle[]>(this.apiUrl);
  }

  getById(id: number) {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
  }

  getStats() {
    return this.http.get<VehicleStats>(`${this.apiUrl}/stats`);
  }

  create(vehicle: Partial<Vehicle>) {
    return this.http.post<Vehicle>(this.apiUrl, vehicle);
  }

  update(id: number, vehicle: Partial<Vehicle>) {
    return this.http.put<void>(`${this.apiUrl}/${id}`, vehicle);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
