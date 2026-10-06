import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryService } from './category';

describe('CategoryService', () => {
  let service: CategoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CategoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GETs categories', () => {
    service.getCategories().subscribe();
    http.expectOne('http://localhost:8080/api/categories').flush([]);
  });

  it('POSTs name and type when creating a category', () => {
    service.createCategory('Gym', 'EXPENSE').subscribe();
    const req = http.expectOne('http://localhost:8080/api/categories');
    expect(req.request.body).toEqual({ name: 'Gym', type: 'EXPENSE' });
    req.flush({ id: 1, name: 'Gym', type: 'EXPENSE' });
  });
});
