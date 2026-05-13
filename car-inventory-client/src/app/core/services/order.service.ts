import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Order {
  id: number;
  vehicleId: number;
  customerId: number;
  status: number;
  notes: string | null;
  createdAt: string;
  closedAt: string | null;
  vehicle: any;
  customer: any;
}

export interface CreateOrderDto {
  vehicleId: number;
  customerId: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private apiUrl = 'http://localhost:5219/api/orders';

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Order[]>(this.apiUrl);
  }

  create(dto: CreateOrderDto) {
    return this.http.post<Order>(this.apiUrl, dto);
  }

  updateStatus(id: number, status: number) {
    return this.http.put(`${this.apiUrl}/${id}/status`, status, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  delete(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
