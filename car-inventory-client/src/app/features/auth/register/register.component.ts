import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { SignalrService } from '../../../core/services/signalr.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>🚗 CarInventory</h1>
          <p>Create your account</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-group">
              <label>First Name</label>
              <input type="text" formControlName="firstName" placeholder="John" />
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input type="text" formControlName="lastName" placeholder="Smith" />
            </div>
          </div>

          <div class="form-group">
            <label>Email</label>
            <input type="email" formControlName="email" placeholder="you@email.com" />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="error">Valid email is required</span>
            }
          </div>

          <div class="form-group">
            <label>Password</label>
            <input type="password" formControlName="password" placeholder="••••••••" />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <span class="error">Minimum 6 characters</span>
            }
          </div>

          @if (errorMessage) {
            <div class="alert-error">{{ errorMessage }}</div>
          }

          <button type="submit" [disabled]="form.invalid || loading" class="btn-primary">
            {{ loading ? 'Creating account...' : 'Create Account' }}
          </button>
        </form>

        <p class="auth-footer">
          Already have an account? <a routerLink="/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; }
    .auth-card { background: #1e293b; border-radius: 12px; padding: 2.5rem; width: 100%; max-width: 440px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
    .auth-header { text-align: center; margin-bottom: 2rem; }
    .auth-header h1 { font-size: 1.75rem; font-weight: 700; color: #38bdf8; margin: 0 0 0.5rem; }
    .auth-header p { color: #94a3b8; margin: 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem; }
    label { font-size: 0.875rem; color: #94a3b8; }
    input { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 0.75rem 1rem; color: #e2e8f0; font-size: 1rem; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: #38bdf8; }
    .error { color: #f87171; font-size: 0.75rem; }
    .alert-error { background: #450a0a; border: 1px solid #ef4444; color: #f87171; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem; }
    .btn-primary { width: 100%; background: #38bdf8; color: #0f172a; border: none; padding: 0.875rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-primary:hover:not(:disabled) { background: #7dd3fc; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .auth-footer { text-align: center; color: #94a3b8; margin-top: 1.5rem; font-size: 0.875rem; }
    .auth-footer a { color: #38bdf8; text-decoration: none; }
  `]
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private signalrService: SignalrService,
    private router: Router
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    this.authService.register(this.form.value).subscribe({
      next: () => {
        this.signalrService.startConnection();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage = err.error || 'Registration failed.';
        this.loading = false;
      }
    });
  }
}
