import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { SessionDetail, SessionSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class SessionsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<{ sessions: SessionSummary[] }> {
    return this.http.get<{ sessions: SessionSummary[] }>('/api/sessions').pipe(catchError(asError));
  }

  detail(id: string): Observable<{ session: SessionDetail }> {
    return this.http
      .get<{ session: SessionDetail }>('/api/sessions/detail', { params: { id } })
      .pipe(catchError(asError));
  }

  delete(id: string): Observable<{ deleted: string; boxes: number }> {
    return this.http
      .delete<{ deleted: string; boxes: number }>('/api/sessions', { params: { id } })
      .pipe(catchError(asError));
  }
}

function asError(error: HttpErrorResponse): Observable<never> {
  const message =
    typeof error.error?.error === 'string'
      ? error.error.error
      : 'The dashboard could not reach the server.';
  return throwError(() => new Error(message));
}
