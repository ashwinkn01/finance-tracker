import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login'; 
import { DashboardComponent } from './components/dashboard/dashboard'; 
import { authGuard } from './guards/auth-guard'; 
import { TransactionsComponent } from './components/transactions/transactions';
import { RegisterComponent } from './components/register/register';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [authGuard] 
  },
  { 
  path: 'transactions', 
  component: TransactionsComponent,
  canActivate: [authGuard] 
    },
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },
  { 
    path: '**', 
    redirectTo: '/login' 
  }
];