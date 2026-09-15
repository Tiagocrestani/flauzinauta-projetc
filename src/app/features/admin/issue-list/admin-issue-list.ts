import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ADMIN_COMIC_REPOSITORY } from '../data/admin-comic.repository';
import { AdminIssue } from '../data/admin-comic.models';
import { AdminConfirmDialogComponent } from '../shared/admin-confirm-dialog';

@Component({
  selector: 'app-admin-issue-list',
  imports: [DatePipe, RouterLink, AdminConfirmDialogComponent],
  templateUrl: './admin-issue-list.html',
  styleUrl: './admin-issue-list.css',
})
export class AdminIssueListComponent {
  private readonly repository = inject(ADMIN_COMIC_REPOSITORY);
  private readonly comicId = inject(ActivatedRoute).snapshot.paramMap.get('comicId') ?? '';

  protected readonly comic = computed(() =>
    this.repository.comics().find((item) => item.id === this.comicId),
  );
  protected readonly pendingDelete = signal<AdminIssue | null>(null);
  protected readonly feedback = signal('');
  protected readonly feedbackIsError = signal(false);

  protected async togglePublication(issue: AdminIssue): Promise<void> {
    try {
      const saved = await this.repository.toggleIssuePublication(this.comicId, issue.id);
      this.feedbackIsError.set(false);
      this.feedback.set(
        saved.publicationStatus === 'published'
          ? `Edição ${saved.number} publicada.`
          : `Edição ${saved.number} movida para rascunho.`,
      );
    } catch (error) {
      this.feedbackIsError.set(true);
      this.feedback.set(
        error instanceof Error ? error.message : 'Não foi possível alterar a edição.',
      );
    }
  }

  protected requestDelete(issue: AdminIssue): void {
    this.pendingDelete.set(issue);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const issue = this.pendingDelete();
    if (!issue) return;

    try {
      await this.repository.deleteIssue(this.comicId, issue.id);
      this.feedbackIsError.set(false);
      this.feedback.set(`Edição ${issue.number} excluída.`);
    } catch (error) {
      this.feedbackIsError.set(true);
      this.feedback.set(
        error instanceof Error ? error.message : 'Não foi possível excluir a edição.',
      );
    } finally {
      this.pendingDelete.set(null);
    }
  }
}
