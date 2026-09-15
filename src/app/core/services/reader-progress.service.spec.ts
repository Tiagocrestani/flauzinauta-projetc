import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ReaderProgressService } from './reader-progress.service';

describe('ReaderProgressService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [ReaderProgressService],
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('saves, updates and retrieves progress by issue', () => {
    const service = TestBed.inject(ReaderProgressService);

    service.saveProgress('sentinela-solar', 'o-sol-negro', 2);
    service.saveProgress('sentinela-solar', 'o-sol-negro', 5);

    expect(service.getProgress('sentinela-solar', 'o-sol-negro')?.pageIndex).toBe(5);
    expect(service.getAllProgress()).toHaveLength(1);
  });

  it('returns the latest progress for a comic when the issue is omitted', () => {
    const service = TestBed.inject(ReaderProgressService);

    service.saveProgress('sentinela-solar', 'o-sol-negro', 2);
    service.saveProgress('sentinela-solar', 'cerco-a-brasilia', 1);

    expect(service.getProgress('sentinela-solar')?.issueSlug).toBe('cerco-a-brasilia');
  });

  it('operates without browser storage during SSR', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ReaderProgressService, { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(ReaderProgressService);

    expect(() => service.saveProgress('sentinela-solar', 'o-sol-negro', 3)).not.toThrow();
    expect(service.getAllProgress()).toEqual([]);
  });
});
