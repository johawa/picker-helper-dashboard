import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';
import { authEnv } from '../environments/auth-env';
import { DashboardPage } from './pages/dashboard/dashboard';
import { LoginPage } from './pages/login/login';
import { SettingsPage } from './pages/settings/settings';
import { SessionDetailPage } from './pages/sessions/session-detail';
import { SessionListPage } from './pages/sessions/session-list';

const signedIn = authEnv.domain && authEnv.clientId ? [authGuardFn] : [];

export const routes: Routes = [
  { path: '', component: DashboardPage },
  { path: 'login', component: LoginPage },
  { path: 'sessions', component: SessionListPage, canActivate: signedIn },
  { path: 'sessions/detail', component: SessionDetailPage, canActivate: signedIn },
  { path: 'settings', component: SettingsPage },
];
