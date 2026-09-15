import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { canDeactivatePendingChanges, PendingChangesAware } from './pending-changes.guard';

describe('canDeactivatePendingChanges', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  it('allows navigation when the component has no pending changes', () => {
    const component: PendingChangesAware = { canDeactivate: () => true };

    expect(canDeactivatePendingChanges(component, route, state, state)).toBe(true);
  });

  it('forwards an asynchronous discard decision', async () => {
    const component: PendingChangesAware = { canDeactivate: () => Promise.resolve(false) };

    await expect(canDeactivatePendingChanges(component, route, state, state)).resolves.toBe(false);
  });
});
