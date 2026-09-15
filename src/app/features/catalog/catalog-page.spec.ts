import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideComicRepository } from '../../core/data/comic-data.providers';
import { CatalogPageComponent } from './catalog-page';

describe('CatalogPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogPageComponent],
      providers: [provideRouter([]), provideComicRepository()],
    }).compileComponents();
  });

  it('filters the local catalog by title', async () => {
    const fixture = TestBed.createComponent(CatalogPageComponent);
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'vertice';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    const cards = fixture.nativeElement.querySelectorAll('app-comic-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Vértice');
  });
});
