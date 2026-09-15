import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideComicRepository } from '../../core/data/comic-data.providers';
import { ReaderProgressService } from '../../core/services/reader-progress.service';
import { HomePageComponent } from './home-page';

describe('HomePageComponent', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [provideRouter([]), provideComicRepository()],
    }).compileComponents();
  });

  afterEach(() => window.localStorage.clear());

  it('renders a saved reading progress as a continue action', async () => {
    TestBed.inject(ReaderProgressService).saveProgress('sentinela-solar', 'o-sol-negro', 2);

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Continuar lendo');
    expect(fixture.nativeElement.textContent).toContain('Página 3');
  });
});
