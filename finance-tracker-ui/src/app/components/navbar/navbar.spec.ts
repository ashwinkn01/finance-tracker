import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { NavbarComponent } from './navbar';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency';
import { ThemeService } from '../../services/theme';
import { fakeJwt } from '../../testing/fake-jwt';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let auth: AuthService;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();
    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(NavbarComponent);
    await fixture.whenStable();
  });

  it('shows only the title when logged out', () => {
    expect(text()).toContain('Finance Tracker');
    expect(text()).not.toContain('Transactions');
    expect(text()).not.toContain('Logout');
  });

  // Regression: the app is zoneless, so the navbar must update when login state changes
  it('shows the links as soon as the user logs in, without a reload', async () => {
    auth.setToken(fakeJwt(3600));
    await fixture.whenStable();
    expect(text()).toContain('Transactions');
    expect(text()).toContain('Dashboard');
    expect(text()).toContain('Logout');
    expect(text()).toContain('Reports');
  });

  it('shows the selected currency code', async () => {
    auth.setToken(fakeJwt(3600));
    TestBed.inject(CurrencyService).set('EUR');
    await fixture.whenStable();
    expect(text()).toContain('EUR');
  });

  it('logout clears the token, hides the links and goes to /login', async () => {
    auth.setToken(fakeJwt(3600));
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance.logout();
    await fixture.whenStable();

    expect(auth.getToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(text()).not.toContain('Logout');
  });

  it('has a theme toggle that works even when logged out', async () => {
    const theme = TestBed.inject(ThemeService);
    expect(theme.isDark()).toBe(true);
    const button = (fixture.nativeElement as HTMLElement).querySelector('button[mat-icon-button]') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    expect(theme.isDark()).toBe(false);
  });

  it('shows the logged-in username', async () => {
    auth.setToken(fakeJwt(3600, 'alice'));
    await fixture.whenStable();
    expect(text()).toContain('alice');
  });
});
