import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '@auth0/auth0-angular';
import { filter, map, of, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { authEnv } from '../environments/auth-env';

const configured = Boolean(authEnv.domain && authEnv.clientId);

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, MatMenuModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly configured = configured;
  private readonly auth = configured ? inject(AuthService) : null;
  private readonly router = inject(Router);
  readonly authenticated = this.auth?.isAuthenticated$ ?? of(false);
  readonly user = this.auth?.user$ ?? of(null);
  readonly settingsActive = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/settings')),
      startWith(this.router.url.startsWith('/settings')),
    ),
    { initialValue: this.router.url.startsWith('/settings') },
  );

  logout(): void {
    this.auth?.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
