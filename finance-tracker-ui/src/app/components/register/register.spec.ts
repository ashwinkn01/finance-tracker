import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register';
import { AuthService } from '../../services/auth.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;
  const valid = { username: 'newuser', email: 'new@x.com', password: 'secret1' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders an email input (required by the backend SignupRequest)', () => {
    expect(fixture.nativeElement.querySelector('input[formControlName="email"]')).toBeTruthy();
  });

  it('rejects a malformed email, short username and short password', () => {
    component.registerForm.setValue({ username: 'abc', email: 'nope', password: '123' });
    expect(component.registerForm.controls['username'].invalid).toBe(true);
    expect(component.registerForm.controls['email'].invalid).toBe(true);
    expect(component.registerForm.controls['password'].invalid).toBe(true);
  });

  it('registers and redirects to /login', () => {
    const register = vi.spyOn(auth, 'register').mockReturnValue(of({ message: 'ok' }));
    component.registerForm.setValue(valid);
    component.onSubmit();
    expect(register).toHaveBeenCalledWith(valid);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('shows the server message when registration fails', () => {
    vi.spyOn(auth, 'register').mockReturnValue(
      throwError(() => ({ error: { message: 'Username is already taken!' } })));
    component.registerForm.setValue(valid);
    component.onSubmit();
    expect(component.errorMessage).toBe('Username is already taken!');
    expect(navigate).not.toHaveBeenCalled();
  });
});
