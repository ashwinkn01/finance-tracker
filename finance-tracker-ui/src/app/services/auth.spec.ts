import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { fakeJwt } from '../testing/fake-jwt';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts login credentials to /auth/login', () => {
    service.login({ username: 'u', password: 'p' }).subscribe(res => expect(res.token).toBe('abc'));
    const req = http.expectOne('http://localhost:8080/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'u', password: 'p' });
    req.flush({ token: 'abc' });
  });

  it('posts registration (including email) to /auth/signup', () => {
    service.register({ username: 'u', email: 'u@x.com', password: 'secret1' }).subscribe();
    const req = http.expectOne('http://localhost:8080/api/auth/signup');
    expect(req.request.body.email).toBe('u@x.com');
    req.flush({ message: 'ok' });
  });

  it('is logged out when there is no token', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.loggedIn()).toBe(false);
  });

  it('flips the loggedIn signal on setToken and logout (navbar regression)', () => {
    service.setToken(fakeJwt(3600));
    expect(service.loggedIn()).toBe(true);
    service.logout();
    expect(service.loggedIn()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('treats an expired token as logged out', () => {
    service.setToken(fakeJwt(-60));
    expect(service.isLoggedIn()).toBe(false);
  });

  it('treats a malformed token as logged out', () => {
    localStorage.setItem('jwt_token', 'not-a-jwt');
    expect(service.isLoggedIn()).toBe(false);
  });

  it('reads the username from the token subject', () => {
    service.setToken(fakeJwt(3600, 'alice'));
    expect(service.getCurrentUsername()).toBe('alice');
  });
});
