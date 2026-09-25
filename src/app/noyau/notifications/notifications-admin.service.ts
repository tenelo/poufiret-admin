import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../config/configuration.service';
import {
  NotificationAdmin,
  ReponseCompteurNotificationsAdmin,
  ReponseNotificationsAdmin,
  ReponseToutLireNotificationsAdmin,
} from '../../modeles/notification-admin.model';

/** Notifications de l'espace admin (/notifications/admin/), réservées aux comptes staff. */
@Injectable({ providedIn: 'root' })
export class NotificationsAdminService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private get base(): string {
    return `${this.configuration.apiUrl}/notifications/admin/`;
  }

  /** GET admin/compteur/ : très léger, prévu pour un polling toutes les 30 s. */
  compteur(): Observable<ReponseCompteurNotificationsAdmin> {
    return this.http.get<ReponseCompteurNotificationsAdmin>(`${this.base}compteur/`);
  }

  /** GET admin/?page_size=N : dernières notifications + nb_non_lues. */
  lister(pageSize = 10): Observable<ReponseNotificationsAdmin> {
    const params = new HttpParams().set('page_size', pageSize);
    return this.http.get<ReponseNotificationsAdmin>(this.base, { params });
  }

  /** POST admin/<id>/lire/ : renvoie la notification à jour (404 si elle n'est pas au compte). */
  lire(id: number): Observable<NotificationAdmin> {
    return this.http.post<NotificationAdmin>(`${this.base}${id}/lire/`, null);
  }

  /** POST admin/tout-lire/ */
  toutLire(): Observable<ReponseToutLireNotificationsAdmin> {
    return this.http.post<ReponseToutLireNotificationsAdmin>(`${this.base}tout-lire/`, null);
  }
}
