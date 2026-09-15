import { CanDeactivateFn } from '@angular/router';

export interface PendingChangesAware {
  canDeactivate(): boolean | Promise<boolean>;
}

export const canDeactivatePendingChanges: CanDeactivateFn<PendingChangesAware> = (component) =>
  component.canDeactivate();
