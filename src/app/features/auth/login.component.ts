import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/api/auth.service';
import { ApiError } from '../../core/api/models';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = signal('rosa@saboresdelpuerto.sv');
  protected password = signal('');
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  protected submit(): void {
    if (this.loading()) return;
    this.error.set(null);
    this.loading.set(true);
    this.auth.login(this.email().trim(), this.password()).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (err) => {
        const msg = (err?.error as ApiError | undefined)?.mensaje;
        this.error.set(msg ?? 'No se pudo iniciar sesión. Revisa tu conexión con el servidor.');
        this.loading.set(false);
      },
    });
  }
}
