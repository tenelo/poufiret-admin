import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';

import { ConfigurationService } from '../../../noyau/config/configuration.service';
import {
  Commande,
  FiltresCommandesPartenaire,
  FiltresPeriode,
  ReponseCommanderLivreur,
  RequeteTransitionCommande,
  ResumeCommandes,
  StatutCommande,
} from '../../../modeles/commande.model';
import { ReponsePaginee } from '../../../modeles/pagination.model';

// DRF peut renvoyer soit un tableau brut, soit une page paginée {results: [...]} :
// on gère les deux formats, comme pour les autres listes de ce projet.
type ReponseListe<T> = T[] | ReponsePaginee<T>;

function normaliserListe<T>(reponse: ReponseListe<T>): T[] {
  return Array.isArray(reponse) ? reponse : reponse.results;
}

function estReponsePaginee<T>(reponse: ReponseListe<T>): reponse is ReponsePaginee<T> {
  return !Array.isArray(reponse);
}

/**
 * Service de gestion des commandes reçues par le partenaire connecté :
 * consultation, transitions de statut, déclenchement d'une course de livraison.
 */
@Injectable({ providedIn: 'root' })
export class MesCommandesService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  private construireParams(filtres: FiltresCommandesPartenaire): HttpParams {
    let params = new HttpParams();
    if (filtres.statut) {
      params = params.set('statut', filtres.statut);
    }
    if (filtres.date) {
      params = params.set('date', filtres.date);
    }
    if (filtres.debut) {
      params = params.set('debut', filtres.debut);
    }
    if (filtres.fin) {
      params = params.set('fin', filtres.fin);
    }
    return params;
  }

  /**
   * GET /orders/commandes/partenaire/?statut=&date=today (ou ?debut=&fin=) :
   * commandes du partenaire connecté. Sans filtre : toutes les commandes.
   */
  listerCommandesPartenaire(filtres: FiltresCommandesPartenaire = {}): Observable<Commande[]> {
    return this.http
      .get<ReponseListe<Commande>>(`${this.configuration.apiUrl}/orders/commandes/partenaire/`, {
        params: this.construireParams(filtres),
      })
      .pipe(map(normaliserListe));
  }

  /**
   * Comme `listerCommandesPartenaire`, mais boucle sur toutes les pages (`next`)
   * plutôt que de ne renvoyer que la première — nécessaire pour la vue tableau du
   * récap, dont le périmètre (ex. "Total global") peut atteindre plusieurs
   * centaines de commandes.
   */
  listerCommandesCompletes(filtres: FiltresCommandesPartenaire = {}): Observable<Commande[]> {
    const params = this.construireParams(filtres).set('page', 1);
    return this.http
      .get<ReponseListe<Commande>>(`${this.configuration.apiUrl}/orders/commandes/partenaire/`, { params })
      .pipe(
        expand((reponse) => {
          if (!estReponsePaginee(reponse) || !reponse.next) {
            return EMPTY;
          }
          const pageSuivante = this.extrairePage(reponse.next);
          if (!pageSuivante) {
            return EMPTY;
          }
          return this.http.get<ReponseListe<Commande>>(
            `${this.configuration.apiUrl}/orders/commandes/partenaire/`,
            { params: this.construireParams(filtres).set('page', pageSuivante) },
          );
        }),
        reduce<ReponseListe<Commande>, Commande[]>((tous, reponse) => [...tous, ...normaliserListe(reponse)], []),
      );
  }

  private extrairePage(urlSuivante: string): number | null {
    try {
      const page = new URL(urlSuivante).searchParams.get('page');
      return page ? Number(page) : null;
    } catch {
      return null;
    }
  }

  /**
   * GET /orders/commandes/partenaire/resume/ : compteurs pour la barre de récap.
   * Sans argument : compteurs globaux. Avec `periode` : compteurs recalculés sur
   * cette période (mêmes paramètres que `listerCommandesPartenaire`, sans statut).
   */
  resume(periode?: FiltresPeriode): Observable<ResumeCommandes> {
    let params = new HttpParams();
    if (periode?.date) {
      params = params.set('date', periode.date);
    }
    if (periode?.debut) {
      params = params.set('debut', periode.debut);
    }
    if (periode?.fin) {
      params = params.set('fin', periode.fin);
    }
    return this.http.get<ResumeCommandes>(`${this.configuration.apiUrl}/orders/commandes/partenaire/resume/`, {
      params,
    });
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
