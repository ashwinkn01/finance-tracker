import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { ReportsComponent } from './reports';
import { DashboardService } from '../../services/dashboard';
import { ReportService } from '../../services/report';
import { CurrencyService } from '../../services/currency';
import { DashboardSummary } from '../../models/dashboard';
import { currentMonth, shiftMonth } from '../../utils/month';

const summary = (over: Partial<DashboardSummary> = {}): DashboardSummary => ({
  totalIncome: 1000, totalExpenses: 200, netBalance: 800,
  expenseBreakdown: [{ category: 'Food', amount: 50 }, { category: 'Rent', amount: 150 }], ...over
});
const empty = summary({ totalIncome: 0, totalExpenses: 0, netBalance: 0, expenseBreakdown: [] });

describe('ReportsComponent', () => {
  let fixture: ComponentFixture<ReportsComponent>;
  let component: ReportsComponent;
  let dashboard: DashboardService;
  let reports: ReportService;
  let getSummary: ReturnType<typeof vi.spyOn>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent!;
  const button = (label: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .find(b => b.textContent!.includes(label)) as HTMLButtonElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ReportsComponent],
      providers: [provideHttpClient()]
    }).compileComponents();
    dashboard = TestBed.inject(DashboardService);
    reports = TestBed.inject(ReportService);
    getSummary = vi.spyOn(dashboard, 'getSummary').mockReturnValue(of(summary()));
  });

  const create = async () => {
    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  it('previews the current month: totals and categories sorted by amount with their share', async () => {
    await create();
    expect(getSummary).toHaveBeenCalledWith(currentMonth());
    expect(text()).toContain('$1,000.00');
    expect(component.categories().map(c => c.name)).toEqual(['Rent', 'Food']);
    expect(component.categories()[0].share).toBe(75);
    expect(text()).toContain('75%');
  });

  it('steps through months but never past the current one', async () => {
    await create();
    component.nextMonth();
    expect(component.month()).toBe(currentMonth());

    component.previousMonth();
    expect(component.month()).toBe(shiftMonth(currentMonth(), -1));
    expect(getSummary).toHaveBeenLastCalledWith(component.month());

    component.goToThisMonth();
    expect(component.month()).toBe(currentMonth());
  });

  it('downloads with the viewed month and the display currency', async () => {
    const download = vi.spyOn(reports, 'download').mockReturnValue(of(new Blob()));
    TestBed.inject(CurrencyService).set('INR');
    await create();

    component.download('pdf');
    expect(download).toHaveBeenCalledWith(currentMonth(), 'pdf', 'INR');
    expect(component.downloading()).toBeNull();
  });

  it('disables the buttons while a download is running and ignores a second click', async () => {
    const pending = new Subject<Blob>();
    const download = vi.spyOn(reports, 'download').mockReturnValue(pending);
    await create();

    component.download('csv');
    expect(component.downloading()).toBe('csv');
    component.download('pdf'); // ignored
    expect(download).toHaveBeenCalledTimes(1);

    fixture.detectChanges();
    expect(button('CSV').disabled).toBe(true);
    expect(button('PDF').disabled).toBe(true);

    pending.next(new Blob());
    pending.complete();
    expect(component.downloading()).toBeNull();
  });

  it('shows an error if the download fails and lets the user retry', async () => {
    vi.spyOn(reports, 'download').mockReturnValue(throwError(() => new Error('boom')));
    await create();

    component.download('csv');
    fixture.detectChanges();
    expect(component.downloadError()).toContain('CSV');
    expect(text()).toContain('Could not generate the CSV report');
    expect(component.downloading()).toBeNull();
  });

  it('shows an empty state and disables downloads for a month with no transactions', async () => {
    getSummary.mockReturnValue(of(empty));
    await create();
    expect(component.isEmpty()).toBe(true);
    expect(text()).toContain('nothing to report');
    expect(button('CSV').disabled).toBe(true);
    expect(button('PDF').disabled).toBe(true);
  });

  it('shows an error message if the month cannot be loaded', async () => {
    getSummary.mockReturnValue(throwError(() => new Error('down')));
    await create();
    expect(text()).toContain('Could not load this month');
    expect(component.isEmpty()).toBe(false);
  });

  it('labels the report with the display currency', async () => {
    TestBed.inject(CurrencyService).set('EUR');
    await create();
    expect(text()).toContain('labelled in EUR');
  });
});
