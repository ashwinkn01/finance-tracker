import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('is invalid until both fields are filled', () => {
    expect(component.loginForm.valid).toBe(false);
    component.loginForm.setValue({ username: 'u', password: 'p' });
    expect(component.loginForm.valid).toBe(true);
  });

  it('stores the token and goes to the dashboard on success', () => {
    vi.spyOn(auth, 'login').mockReturnValue(of({ token: 'tok' }));
    const setToken = vi.spyOn(auth, 'setToken');
    component.loginForm.setValue({ username: 'u', password: 'p' });
    component.onSubmit();
    expect(setToken).toHaveBeenCalledWith('tok');
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('shows an error and does not navigate on failure', () => {
    vi.spyOn(auth, 'login').mockReturnValue(throwError(() => ({ status: 401 })));
    component.loginForm.setValue({ username: 'u', password: 'bad' });
    component.onSubmit();
    expect(component.errorMessage).toContain('Invalid');
    expect(navigate).not.toHaveBeenCalled();
  });
});
