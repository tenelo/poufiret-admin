import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigurationService } from '../config/configuration.service';
import { ReponseClePubliquePush, RequeteAbonnementPush } from '../../modeles/notification-push.model';

/** Appels réseau de l'abonnement Web Push (/notifications/push-web/...), admin et partenaire. */
@Injectable({ providedIn: 'root' })
export class NotificationsPushService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private base(): string {
    return `${this.configuration.apiUrl}/notifications/push-web/`;
  }

  clePublique(): Observable<ReponseClePubliquePush> {
    return this.http.get<ReponseClePubliquePush>(`${this.base()}cle-publique/`);
  }

  enregistrerAbonnement(abonnement: RequeteAbonnementPush): Observable<void> {
    return this.http.post<void>(`${this.base()}abonnement/`, abonnement);
  }

  /** DELETE avec corps (PushSubscription JSON) : identifie l'abonnement à retirer par son endpoint. */
  supprimerAbonnement(abonnement: RequeteAbonnementPush): Observable<void> {
    return this.http.delete<void>(`${this.base()}abonnement/`, { body: abonnement });
  }

  envoyerTest(): Observable<void> {
    return this.http.post<void>(`${this.base()}test/`, {});
  }
}
