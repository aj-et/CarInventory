import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div class="dialog" (click)="$event.stopPropagation()">
        <div class="dialog-icon">⚠️</div>
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
        <div class="dialog-footer">
          <button class="btn-secondary" (click)="cancelled.emit()">Cancel</button>
          <button class="btn-danger" (click)="confirmed.emit()">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
    .dialog { background: #1e293b; border-radius: 12px; padding: 2rem; width: 100%; max-width: 400px; border: 1px solid #334155; text-align: center; }
    .dialog-icon { font-size: 2.5rem; margin-bottom: 1rem; }
    h2 { font-size: 1.25rem; font-weight: 700; color: #f1f5f9; margin: 0 0 0.75rem; }
    p { color: #94a3b8; margin: 0 0 1.5rem; font-size: 0.925rem; line-height: 1.6; }
    .dialog-footer { display: flex; gap: 0.75rem; justify-content: center; }
    .btn-secondary { background: transparent; color: #94a3b8; border: 1px solid #334155; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.875rem; }
    .btn-secondary:hover { background: #334155; }
    .btn-danger { background: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 600; }
    .btn-danger:hover { background: #dc2626; }
  `]
})
export class ConfirmDialogComponent {
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Delete';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
