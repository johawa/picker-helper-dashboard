import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { LoginPage } from './pages/login/login';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideNoopAnimations()],
    }).compileComponents();
  });

  it('should show the dashboard name', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Picker');
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.textContent).toContain('Sessions');
  });
});

describe('LoginPage', () => {
  it('explains how to configure Auth0', () => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter(routes), provideNoopAnimations()],
    });
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Auth0 is not configured yet');
    expect(fixture.nativeElement.textContent).toContain('http://localhost:4300');
  });
});
