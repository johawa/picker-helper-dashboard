import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { AuthService } from '@auth0/auth0-angular';
import { authEnv } from '../../../environments/auth-env';

const configured = Boolean(authEnv.domain && authEnv.clientId);

@Component({
  selector: 'app-login',
  imports: [MatButton, AsyncPipe],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  readonly configured = configured;
  readonly audienceReady = Boolean(authEnv.audience);
  private readonly auth = configured ? inject(AuthService) : null;
  private readonly router = inject(Router);
  readonly error = this.auth?.error$;

  constructor() {
    this.auth?.isAuthenticated$.pipe(takeUntilDestroyed()).subscribe((signedIn) => {
      if (signedIn) void this.router.navigateByUrl('/sessions');
    });
  }

  login(): void {
    this.auth?.loginWithRedirect({
      appState: { target: '/sessions' },
    });
  }
}
