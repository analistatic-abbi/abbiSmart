import { Component, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

import { LOGO_ABBI } from '../../../core/constants/branding';

import { mensajeErrorApi } from '../../../core/utils/api-error.util';



const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

const PASSWORD_HINT =

  'La contraseña debe tener mínimo 8 caracteres, 1 mayúscula y 1 número';



@Component({

  selector: 'app-reset-password',

  standalone: true,

  imports: [ReactiveFormsModule, RouterLink],

  templateUrl: './reset-password.component.html',

  styleUrl: './reset-password.component.scss',

})

export class ResetPasswordComponent {

  private readonly fb = inject(FormBuilder);

  private readonly route = inject(ActivatedRoute);

  private readonly auth = inject(AuthService);



  protected readonly logoUrl = LOGO_ABBI;

  protected readonly loading = signal(false);

  protected readonly message = signal<string | null>(null);

  protected readonly error = signal<string | null>(null);



  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';



  protected readonly form = this.fb.nonNullable.group({

    password: ['', [Validators.required, Validators.pattern(PASSWORD_REGEX)]],

    confirm: ['', [Validators.required]],

  });



  protected submit(): void {

    this.error.set(null);



    if (this.form.value.password !== this.form.value.confirm) {

      this.form.markAllAsTouched();

      this.error.set('Las contraseñas no coinciden.');

      return;

    }



    if (this.form.invalid) {

      this.form.markAllAsTouched();

      this.error.set(PASSWORD_HINT);

      return;

    }



    this.loading.set(true);

    this.auth.resetPassword(this.token, this.form.value.password!).subscribe({

      next: (r) => {

        this.message.set(r.message);

        this.loading.set(false);

      },

      error: (err) => {

        this.error.set(

          mensajeErrorApi(err, 'No fue posible restablecer la contraseña.'),

        );

        this.loading.set(false);

      },

    });

  }

}

