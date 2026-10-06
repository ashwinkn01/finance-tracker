import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyService } from '../../services/currency';
import { AuthService } from '../../services/auth.service'; // Adjust to auth.ts if your service lacks the .service suffix

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatToolbarModule, 
    MatButtonModule,
    MatMenuModule,
    MatIconModule
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent {
  // We make this public so the HTML file can read it
  authService = inject(AuthService);
  currency = inject(CurrencyService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout(); // Deletes the token from localStorage
    this.router.navigate(['/login']); // Kicks them back to the login screen
  }
}