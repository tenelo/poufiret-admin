import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  Commande,
  ReponseCommanderLivreur,
  RequeteTransitionCommande,
  StatutCommande,
} from '../../../modeles/commande.model';

// DRF peut renvoyer soit un tableau brut, soit une page paginée {results: [...]} :
// on gère les deux formats, comme pour les autres listes de ce projet.
type ReponseListe<T> = T[] | { results: T[] };

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

/**
 * Service de gestion des commandes reçues par le partenaire connecté :
 * consultation, transitions de statut, déclenchement d'une course de livraison.
 */
@Injectable({ providedIn: 'root' })
export class MesCommandesService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  /** GET /orders/commandes/partenaire/?statut= : commandes du partenaire connecté. */
  listerCommandesPartenaire(statut?: StatutCommande | ''): Observable<Commande[]> {
    const params = statut ? new HttpParams().set('statut', statut) : undefined;
    return this.http
      .get<ReponseListe<Commande>>(`${this.configuration.apiUrl}/orders/commandes/partenaire/`, {
        params,
      })
      .pipe(map(normaliserListe));
  }

  /** GET /orders/commandes/<id>/ : détail complet d'une commande. */
  obtenirCommande(id: number): Observable<Commande> {
    return this.http.get<Commande>(`${this.configuration.apiUrl}/orders/commandes/${id}/`);
  }

  /** POST /orders/commandes/<id>/transition/ : fait avancer le statut de la commande. */
  changerStatut(id: number, statut: StatutCommande, raisonRefus?: string): Observable<Commande> {
    const donnees: RequeteTransitionCommande = raisonRefus
      ? { statut, raison_refus: raisonRefus }
      : { statut };
    return this.http.post<Commande>(
      `${this.configuration.apiUrl}/orders/commandes/${id}/transition/`,
      donnees,
    );
  }

  /** POST /orders/commandes/<id>/livreur/ : déclenche une course de livraison. */
  commanderLivreur(id: number): Observable<ReponseCommanderLivreur> {
    return this.http.post<ReponseCommanderLivreur>(
      `${this.configuration.apiUrl}/orders/commandes/${id}/livreur/`,
      {},
    );
  }
}
