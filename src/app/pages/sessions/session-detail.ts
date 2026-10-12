import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { berryLabel, helsinki, kgLabel, SessionDetail } from '../../models';
import { SessionsApi } from '../../services/sessions-api';
import { DeleteSessionDialog } from './delete-dialog';

@Component({
  selector: 'app-session-detail',
  imports: [RouterLink, MatButton, MatProgressBar, MatTableModule],
  templateUrl: './session-detail.html',
  styleUrl: './session-detail.css',
})
export class SessionDetailPage {
  private readonly api = inject(SessionsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  readonly columns = ['picker', 'kilograms', 'time'];
  readonly loading = signal(true);
  readonly deleting = signal(false);
  readonly error = signal('');
  readonly session = signal<SessionDetail | null>(null);
  readonly berryLabel = berryLabel;
  readonly helsinki = helsinki;
  readonly kgLabel = kgLabel;
  private readonly id = this.route.snapshot.queryParamMap.get('id') ?? '';

  constructor() {
    if (!this.id) {
      this.error.set('Choose a session.');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  confirmDelete(): void {
    const session = this.session();
    if (!session || this.deleting()) return;
    const ref = this.dialog.open(DeleteSessionDialog, {
      data: { name: session.name, boxCount: session.boxCount },
      width: '28rem',
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.deleteSession();
    });
  }

  private load(): void {
    this.api.detail(this.id).subscribe({
      next: (result) => {
        this.session.set(result.session);
        this.loading.set(false);
      },
      error: (problem: Error) => {
        this.error.set(problem.message);
        this.loading.set(false);
      },
    });
  }

  private deleteSession(): void {
    this.deleting.set(true);
    this.error.set('');
    this.api.delete(this.id).subscribe({
      next: () => void this.router.navigateByUrl('/sessions'),
      error: (problem: Error) => {
        this.error.set(problem.message);
        this.deleting.set(false);
      },
    });
  }
}
