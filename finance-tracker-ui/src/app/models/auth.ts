// Maps to your Spring Boot LoginDto
export interface LoginRequest {
  username: string;
  password?: string;
}

// Maps to your Spring Boot RegisterDto
export interface RegisterRequest {
  username: string;
  email: string;
  password?: string;
}

// Maps to the JSON response your backend sends upon successful login
export interface AuthResponse {
  token: string;
}