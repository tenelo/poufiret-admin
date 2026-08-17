import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Expose la configuration de l'environnement courant (URL de l'API, etc.)
 * au reste de l'application, sans dépendre directement du fichier environment.
 */
@Injectable({ providedIn: 'root' })
export class ConfigurationService {
  readonly apiUrl = environment.apiUrl;
  readonly production = environment.production;
}
