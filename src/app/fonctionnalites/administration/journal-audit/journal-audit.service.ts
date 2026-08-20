import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import { ReponseJournalAudit } from '../../../modeles/entree-journal.model';
import { declencherTelechargementFichier, nomFichierHorodate } from '../telecharger-fichier';

/** Service de lecture du journal de modération et de son export CSV. */
@Injectable({ providedIn: 'root' })
export class JournalAuditService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /administration/moderation/journal/ : 200 entrées les plus récentes max. */
  charger(): Observable<ReponseJournalAudit> {
    return this.http.get<ReponseJournalAudit>(
      `${this.configuration.apiUrl}/administration/moderation/journal/`,
    );
  }

  /**
   * GET /administration/moderation/journal/export/ : récupère le CSV et
   * déclenche son téléchargement (nom de fichier horodaté). Nécessite
   * lire_journal ET exporter_csv côté backend.
   */
  exporterCsv(): Observable<void> {
    return this.http
      .get(`${this.configuration.apiUrl}/administration/moderation/journal/export/`, {
        responseType: 'blob',
      })
      .pipe(
        tap((blob) => declencherTelechargementFichier(blob, nomFichierHorodate('journal-audit', 'csv'))),
        map(() => undefined),
      );
  }
}
