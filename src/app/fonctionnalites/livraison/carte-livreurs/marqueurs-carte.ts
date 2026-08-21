import * as L from 'leaflet';

import { CourseLivraison, LIBELLES_STATUT_COURSE } from '../modeles/course-livraison.model';
import { LivreurBureau, StatutLivreur, iconeVehicule } from '../modeles/livreur-bureau.model';
import { formaterDateRelativeLivraison } from '../formatage-livraison';

/**
 * Icônes et popups des marqueurs de la carte temps réel — regroupés ici pour
 * garder carte-livreurs.ts lisible. Tout le HTML de marqueur/popup est stylé
 * en inline : Leaflet crée ce DOM en dehors du template Angular, un style de
 * composant scoppé ne l'atteindrait pas.
 */

function echapperHtml(texte: string): string {
  const div = document.createElement('div');
  div.textContent = texte;
  return div.innerHTML;
}

function pastille(couleur: string, contenu: string): string {
  return `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${couleur};color:#ffffff;font-size:11px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,0.4);border:2px solid #ffffff;">${contenu}</span>`;
}

export function iconeLivreur(statut: StatutLivreur): L.DivIcon {
  const couleur = statut === 'en_ligne' ? '#15803d' : '#9ca3af';
  return L.divIcon({
    className: 'marqueur-livreur-tenelivr',
    html: pastille(couleur, ''),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

export function iconePointCourse(lettre: 'A' | 'B'): L.DivIcon {
  const couleur = lettre === 'A' ? '#0369a1' : '#ea580c';
  return L.divIcon({
    className: 'marqueur-point-course-tenelivr',
    html: pastille(couleur, lettre),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

export function contenuPopupLivreur(livreur: LivreurBureau): string {
  return `<div>
    <strong>${iconeVehicule(livreur.type_vehicule)} ${echapperHtml(livreur.nom)}</strong><br>
    <span>${echapperHtml(livreur.telephone)}</span><br>
    <span>${livreur.statut === 'en_ligne' ? 'En ligne' : 'Hors ligne'}</span><br>
    <span>Position : ${formaterDateRelativeLivraison(livreur.position_maj_le)}</span>
  </div>`;
}

export function contenuPopupPointCourse(course: CourseLivraison, lettre: 'A' | 'B'): string {
  const point = lettre === 'A' ? course.point_a : course.point_b;
  return `<div>
    <strong>Course ${echapperHtml(course.numero)} — Point ${lettre}</strong><br>
    <span>${echapperHtml(point.quartier)}</span><br>
    <span>Statut : ${echapperHtml(LIBELLES_STATUT_COURSE[course.statut])}</span>
  </div>`;
}
