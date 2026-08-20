/**
 * Reflète le format `_course_dict` renvoyé par le backend TeneLivr
 * (GET/POST /livraison/bureau/courses/...). Modèle local au module livraison
 * (isolation — pas de dépendance aux modèles de l'espace admin Poufiret).
 */

export type StatutCourse =
  | 'demandee'
  | 'assignee'
  | 'acceptee'
  | 'vers_a'
  | 'colis_pris'
  | 'vers_b'
  | 'livree'
  | 'refusee'
  | 'annulee';

export interface CoordonneesGps {
  latitude: number;
  longitude: number;
}

export interface PointCourse {
  quartier: string;
  nom_contact: string;
  telephone_contact: string;
  gps: CoordonneesGps | null;
}

export interface CourseLivraison {
  id: string;
  numero: string;
  statut: StatutCourse;
  ville: number;
  description_colis: string;
  prix: number | null;
  point_a: PointCourse;
  point_b: PointCourse;
  livreur: string | null;
  livreur_position: CoordonneesGps | null;
  position_b_deposee: boolean;
  cree_le: string;
}

// Corps de POST /livraison/bureau/courses/<id>/assigner/.
export interface RequeteAssignerLivreur {
  livreur_id: string;
}

// Corps de POST /livraison/bureau/courses/creer/ (ville forcée côté serveur).
export interface RequeteCreerCourse {
  a_quartier: string;
  a_nom_contact: string;
  a_telephone_contact: string;
  b_quartier: string;
  b_nom_contact: string;
  b_telephone_contact: string;
  a_latitude?: number;
  a_longitude?: number;
  b_latitude?: number;
  b_longitude?: number;
  description_colis?: string;
  prix?: number;
}

export interface ReponseCreationCourse {
  course: CourseLivraison;
  assigne: boolean;
  message?: string;
}

export const LIBELLES_STATUT_COURSE: Record<StatutCourse, string> = {
  demandee: 'Demandée',
  assignee: 'Assignée',
  acceptee: 'Acceptée',
  vers_a: 'Vers point A',
  colis_pris: 'Colis pris',
  vers_b: 'Vers point B',
  livree: 'Livrée',
  refusee: 'Refusée',
  annulee: 'Annulée',
};

export const OPTIONS_STATUT_COURSE: { valeur: StatutCourse | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'demandee', libelle: 'Demandée' },
  { valeur: 'assignee', libelle: 'Assignée' },
  { valeur: 'acceptee', libelle: 'Acceptée' },
  { valeur: 'vers_a', libelle: 'Vers point A' },
  { valeur: 'colis_pris', libelle: 'Colis pris' },
  { valeur: 'vers_b', libelle: 'Vers point B' },
  { valeur: 'livree', libelle: 'Livrée' },
  { valeur: 'refusee', libelle: 'Refusée' },
  { valeur: 'annulee', libelle: 'Annulée' },
];

/** Course à mettre en évidence : demandée ou refusée, sans livreur assigné. */
export function estCourseAAssigner(course: CourseLivraison): boolean {
  return (course.statut === 'demandee' || course.statut === 'refusee') && !course.livreur;
}

// Heuristique d'affichage uniquement (n'affiche pas un bouton qui échouerait
// à coup sûr) — le backend reste seul juge (400 sinon) : pas d'assignation
// possible une fois le colis pris en charge ou la course terminée/annulée.
const STATUTS_ASSIGNABLES: StatutCourse[] = ['demandee', 'assignee', 'acceptee', 'refusee'];

export function estCourseAssignable(course: CourseLivraison): boolean {
  return STATUTS_ASSIGNABLES.includes(course.statut);
}

export function classeChipStatutCourse(statut: StatutCourse): string {
  switch (statut) {
    case 'demandee':
      return 'chip-attention';
    case 'refusee':
      return 'chip-erreur';
    case 'annulee':
      return 'chip-neutre';
    case 'livree':
      return 'chip-succes';
    default:
      return 'chip-info';
  }
}
