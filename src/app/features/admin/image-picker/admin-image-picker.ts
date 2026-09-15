import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  output,
  signal,
} from '@angular/core';

import {
  ADMIN_IMAGE_ACCEPT,
  formatAdminImageFileSize,
  validateAdminImageFile,
} from '../shared/admin-image-file.utils';

interface SelectedImageMetadata {
  name: string;
  type: string;
  size: string;
}

@Component({
  selector: 'app-admin-image-picker',
  templateUrl: './admin-image-picker.html',
  styleUrl: './admin-image-picker.css',
})
export class AdminImagePickerComponent implements OnChanges, OnDestroy {
  @Input() imageUrl = '';
  @Input() label = 'Imagem';

  readonly imageUrlChange = output<string>();

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  protected readonly previewUrl = signal('');
  protected readonly metadata = signal<SelectedImageMetadata | null>(null);
  protected readonly error = signal('');
  protected readonly acceptedFormats = ADMIN_IMAGE_ACCEPT;

  private pendingUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imageUrl']) {
      if (this.pendingUrl && this.imageUrl !== this.pendingUrl) {
        this.releasePendingUrl();
      }
      if (!this.pendingUrl) {
        this.previewUrl.set(this.imageUrl);
        this.metadata.set(null);
      }
    }
  }

  ngOnDestroy(): void {
    this.releasePendingUrl();
  }

  protected selectImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    input.value = '';
    if (!file) return;

    const validation = validateAdminImageFile(file);
    if (!validation.valid) {
      this.error.set(validation.message);
      return;
    }

    this.releasePendingUrl();
    this.pendingUrl = URL.createObjectURL(file);
    this.previewUrl.set(this.pendingUrl);
    this.metadata.set({
      name: file.name,
      type: validation.format,
      size: formatAdminImageFileSize(file.size),
    });
    this.error.set('');
    this.imageUrlChange.emit(this.pendingUrl);
  }

  protected removeImage(): void {
    this.releasePendingUrl();
    this.previewUrl.set('');
    this.metadata.set(null);
    this.error.set('');
    if (this.fileInput) this.fileInput.nativeElement.value = '';
    this.imageUrlChange.emit('');
  }

  /** Call only after the repository has accepted the URL and assumed its lifecycle. */
  commitCurrentUrl(): void {
    this.pendingUrl = null;
  }

  private releasePendingUrl(): void {
    if (this.pendingUrl) {
      URL.revokeObjectURL(this.pendingUrl);
      this.pendingUrl = null;
    }
  }
}
