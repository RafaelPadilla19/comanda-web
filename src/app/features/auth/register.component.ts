import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/api/auth.service';
import { ApiError, CA_COUNTRIES } from '../../core/api/models';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './login.component.css',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly countries = CA_COUNTRIES;
  protected restaurant = signal('');
  protected name = signal('');
  protected email = signal('');
  protected password = signal('');
  protected country = signal('');
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  protected readonly canSubmit = computed(() =>
    !!this.restaurant().trim() && !!this.name().trim() && !!this.email().trim()
    && this.password().length >= 8 && !!this.country(),
  );

  protected submit(): void {
    if (this.loading() || !this.canSubmit()) return;
    this.error.set(null);
    this.loading.set(true);
    this.auth.register({
      restaurantName: this.restaurant().trim(),
      adminName: this.name().trim(),
      email: this.email().trim(),
      password: this.password(),
      country: this.country(),
    }).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (err) => {
        const msg = (err?.error as ApiError | undefined)?.mensaje;
        this.error.set(msg ?? 'No se pudo crear la cuenta. Revisa tu conexión con el servidor.');
        this.loading.set(false);
      },
    });
  }
}
