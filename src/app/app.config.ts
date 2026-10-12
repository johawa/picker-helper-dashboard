import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';
import { routes } from './app.routes';
import { authEnv } from '../environments/auth-env';

const configured = Boolean(authEnv.domain && authEnv.clientId);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    ...(configured
      ? [
          provideAuth0({
            domain: authEnv.domain,
            clientId: authEnv.clientId,
            authorizationParams: {
              redirect_uri: typeof window === 'undefined' ? 'http://localhost:4300' : window.location.origin,
              scope: 'openid profile email',
              ...(authEnv.audience ? { audience: authEnv.audience } : {}),
            },
            httpInterceptor: {
              allowedList: ['/api/*'],
            },
          }),
        ]
      : []),
    provideHttpClient(configured ? withInterceptors([authHttpInterceptorFn]) : withInterceptors([])),
  ],
};
