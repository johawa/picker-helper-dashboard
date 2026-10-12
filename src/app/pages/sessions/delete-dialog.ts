import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface DeleteDialogData {
  name: string;
  boxCount: number;
}

@Component({
  selector: 'app-delete-session-dialog',
  imports: [MatDialogModule, MatButton],
  template: `
    <h2 mat-dialog-title>Delete this session?</h2>
    <mat-dialog-content>
      <p>
        <strong>{{ data.name }}</strong> and its {{ data.boxCount }} boxes will be removed from the database.
      </p>
      <p>
        Phones that have already sent this session drop it on the next sync. A phone that still has unsent boxes can
        write it back.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton="text" type="button" mat-dialog-close>Cancel</button>
      <button matButton="filled" class="danger" type="button" [mat-dialog-close]="true">Delete session</button>
    </mat-dialog-actions>
  `,
})
export class DeleteSessionDialog {
  readonly data = inject<DeleteDialogData>(MAT_DIALOG_DATA);
}
