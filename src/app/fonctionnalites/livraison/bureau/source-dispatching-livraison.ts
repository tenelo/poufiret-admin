import { Observable } from 'rxjs';

import { CourseLivraison, StatutCourse } from '../modeles/course-livraison.model';
import { LivreurBureau, StatutLivreur } from '../modeles/livreur-bureau.model';

/**
 * Abstraction commune aux sources de données "dispatching" (bureau à ville
 * unique, coordonnateur multi-villes) — permet à `DispatchingGestionnaire`
 * et `CarteLivreurs` de rester des composants uniques, paramétrés par la
 * source plutôt que dupliqués par espace. `villeId` est ignoré par les
 * sources qui n'en ont pas besoin (bureau, déjà scoppé côté serveur).
 */
export interface SourceDispatchingLivraison {
  listerCourses(statut?: StatutCourse | '', villeId?: number): Observable<CourseLivraison[]>;
  listerLivreurs(statut?: StatutLivreur | '', villeId?: number): Observable<LivreurBureau[]>;
  assignerLivreur(courseId: string, livreurId: string): Observable<CourseLivraison>;
}
