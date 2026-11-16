import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PubsPoufiretService } from './pubs-poufiret.service';
import { ConfigurationService } from '../../../../noyau/config/configuration.service';
import { FILTRES_PUBS_POUFIRET_DEFAUT } from '../../../../modeles/pub-poufiret.model';

const API = 'https://api.test/api/v1';

function champs(formData: FormData): Record<string, FormDataEntryValue> {
  const resultat: Record<string, FormDataEntryValue> = {};
  formData.forEach((valeur, cle) => (resultat[cle] = valeur));
  return resultat;
}

describe('PubsPoufiretService', () => {
  let service: PubsPoufiretService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigurationService, useValue: { apiUrl: API } },
      ],
    });
    service = TestBed.inject(PubsPoufiretService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('chargerPubs : page/page_size toujours envoyés, est_active seulement si précisé', () => {
    service.chargerPubs({ ...FILTRES_PUBS_POUFIRET_DEFAUT, estActive: 'true', page: 2, pageSize: 50 }).subscribe();
    const requete = http.expectOne((r) => r.url === `${API}/publicites/admin/poufiret/pubs/`);
    expect(requete.request.params.get('page')).toBe('2');
    expect(requete.request.params.get('page_size')).toBe('50');
    expect(requete.request.params.get('est_active')).toBe('true');
    requete.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('creerPub : multipart avec image obligatoire et champs attendus', () => {
    const image = new File(['x'], 'pub.png', { type: 'image/png' });
    service
      .creerPub({
        titre: 'Soldes',
        texte: 'Texte',
        imageCouverture: image,
        categorie: 7,
        dateDebut: '2026-01-01',
        dateFin: null,
        portee: 'region',
        region: 3,
        departement: null,
      })
      .subscribe();
    const requete = http.expectOne(`${API}/publicites/admin/poufiret/pubs/`);
    expect(requete.request.method).toBe('POST');
    const corps = champs(requete.request.body as FormData);
    expect(corps['titre']).toBe('Soldes');
    expect((corps['image_couverture'] as File).name).toBe('pub.png');
    expect(corps['categorie']).toBe('7');
    expect(corps['date_debut']).toBe('2026-01-01');
    expect(corps['date_fin']).toBe('');
    expect(corps['portee']).toBe('region');
    expect(corps['region']).toBe('3');
    expect(corps['departement']).toBe('');
    requete.flush({});
  });

  it('modifierPub : partiel, les champs absents ne sont pas envoyés', () => {
    service.modifierPub('p1', { titre: 'Nouveau titre' }).subscribe();
    const requete = http.expectOne(`${API}/publicites/admin/poufiret/pubs/p1/`);
    expect(requete.request.method).toBe('PATCH');
    const corps = champs(requete.request.body as FormData);
    expect(corps['titre']).toBe('Nouveau titre');
    expect(corps['categorie']).toBeUndefined();
    expect(corps['portee']).toBeUndefined();
    requete.flush({});
  });

  it('basculerActivePub : PATCH JSON simple (pas de FormData)', () => {
    service.basculerActivePub('p1', false).subscribe();
    const requete = http.expectOne(`${API}/publicites/admin/poufiret/pubs/p1/`);
    expect(requete.request.body).toEqual({ est_active: false });
    requete.flush({});
  });

  it('reordonnerPubs : POST {ids}', () => {
    service.reordonnerPubs(['a', 'b', 'c']).subscribe();
    const requete = http.expectOne(`${API}/publicites/admin/poufiret/pubs/ordre/`);
    expect(requete.request.body).toEqual({ ids: ['a', 'b', 'c'] });
    requete.flush({ ids: ['a', 'b', 'c'] });
  });

  it('chargerEcrans : lit la clé ecrans de la réponse', () => {
    let resultat: unknown;
    service.chargerEcrans().subscribe((r) => (resultat = r));
    const requete = http.expectOne(`${API}/publicites/admin/poufiret/ecrans/`);
    requete.flush({ ecrans: [{ id: 'e1' }] });
    expect(resultat).toEqual([{ id: 'e1' }]);
  });

  it('creerEcran : bouton_libelle/bouton_categorie envoyés même vides (pour les effacer)', () => {
    const image = new File(['x'], 'ecran.png', { type: 'image/png' });
    service.creerEcran({ titre: 'Écran', image, boutonLibelle: '', boutonCategorie: null }).subscribe();
    const requete = http.expectOne(`${API}/publicites/admin/poufiret/ecrans/`);
    const corps = champs(requete.request.body as FormData);
    expect(corps['bouton_libelle']).toBe('');
    expect(corps['bouton_categorie']).toBe('');
    requete.flush({});
  });

  it('publierParcours : POST sans corps', () => {
    service.publierParcours().subscribe();
    const requete = http.expectOne(`${API}/publicites/admin/poufiret/parcours/publier/`);
    expect(requete.request.method).toBe('POST');
    requete.flush({ version_parcours: 2, nb_ecrans: 5, parcours_actif: true });
  });

  it('modifierReglages : seuls les champs fournis (snake_case) sont envoyés', () => {
    service.modifierReglages({ frequencePubMaison: 5 }).subscribe();
    const requete = http.expectOne(`${API}/publicites/admin/poufiret/reglages/`);
    expect(requete.request.body).toEqual({ frequence_pub_maison: 5 });
    requete.flush({});
  });

  it('exporterPubsCsv : GET blob avec export=csv', () => {
    service.exporterPubsCsv().subscribe();
    const requete = http.expectOne((r) => r.url === `${API}/publicites/admin/poufiret/pubs/`);
    expect(requete.request.params.get('export')).toBe('csv');
    expect(requete.request.responseType).toBe('blob');
    requete.flush(new Blob(['x']));
  });
});
