import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../config/configuration.service';
import {
  CanalNotificationAdmin,
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

  /** GET admin/compteur/ : {restaurant, general, nb_non_lues} — très léger, prévu pour un polling toutes les 30 s. */
  compteur(): Observable<ReponseCompteurNotificationsAdmin> {
    return this.http.get<ReponseCompteurNotificationsAdmin>(`${this.base}compteur/`);
  }

  /** GET admin/?canal=&page_size=N : dernières notifications de ce canal + nb_non_lues du canal. */
  lister(canal: CanalNotificationAdmin, pageSize = 10): Observable<ReponseNotificationsAdmin> {
    const params = new HttpParams().set('canal', canal).set('page_size', pageSize);
    return this.http.get<ReponseNotificationsAdmin>(this.base, { params });
  }

  /** POST admin/<id>/lire/ : renvoie la notification à jour (404 si elle n'est pas au compte). */
  lire(id: number): Observable<NotificationAdmin> {
    return this.http.post<NotificationAdmin>(`${this.base}${id}/lire/`, null);
  }

  /** POST admin/tout-lire/?canal= : ne marque comme lu que les notifications de ce canal. */
  toutLire(canal: CanalNotificationAdmin): Observable<ReponseToutLireNotificationsAdmin> {
    const params = new HttpParams().set('canal', canal);
    return this.http.post<ReponseToutLireNotificationsAdmin>(`${this.base}tout-lire/`, null, { params });
  }
}
