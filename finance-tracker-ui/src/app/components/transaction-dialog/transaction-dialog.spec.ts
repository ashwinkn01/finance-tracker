import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionDialog } from './transaction-dialog';

describe('TransactionDialog', () => {
  let component: TransactionDialog;
  let fixture: ComponentFixture<TransactionDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
