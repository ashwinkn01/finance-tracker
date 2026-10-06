import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { jwtInterceptor } from './jwt-interceptor';

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('adds the Bearer header when a token exists', () => {
    localStorage.setItem('jwt_token', 'abc');
    http.get('/x').subscribe();
    const req = controller.expectOne('/x');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({});
  });

  it('sends no Authorization header without a token', () => {
    http.get('/x').subscribe();
    const req = controller.expectOne('/x');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
