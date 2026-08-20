/** Format de pagination standard de Django REST Framework (PageNumberPagination). */
export interface ReponsePaginee<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
