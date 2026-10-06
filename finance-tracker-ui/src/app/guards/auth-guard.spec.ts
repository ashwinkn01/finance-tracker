import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth.service';
import { fakeJwt } from '../testing/fake-jwt';

describe('authGuard', () => {
  const run = () =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });

  it('lets a logged-in user through', () => {
    TestBed.inject(AuthService).setToken(fakeJwt(3600));
    expect(run()).toBe(true);
  });

  it('redirects an anonymous user to /login', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(run()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
