import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DialogPubPartenaire } from './dialog-pub-partenaire';
import { ConfigurationService } from '../../../../noyau/config/configuration.service';
import { PubliciteAdmin, QuotaFormule } from '../../../../modeles/publicites-admin.model';

const API = 'https://api.test/api/v1';

function formule(id: string, nom: string, dureeJours: number, placesRestantes = 3): QuotaFormule {
  return {
    id,
    nom,
    prix: 10000,
    est_active: true,
    quota_partenaires: 5,
    nb_actives: 5 - placesRestantes,
    places_restantes: placesRestantes,
    nb_en_attente: 0,
    nb_en_attente_paiement: 0,
    nb_en_attente_validation: 0,
    duree_jours: dureeJours,
  };
}

const FORMULES = [formule('f-or', 'Or', 30), formule('f-argent', 'Argent', 7, 0)];

const PUB_TERMINEE: PubliciteAdmin = {
  id: 'pub-1',
  titre: 'Soldes de Noël',
  formule: 'Argent',
  formule_id: 'f-argent',
  statut: 'terminee',
  debut_diffusion: '2026-10-01',
  fin_diffusion: '2026-10-08',
};

function champs(formData: FormData): Record<string, FormDataEntryValue> {
  const resultat: Record<string, FormDataEntryValue> = {};
  formData.forEach((valeur, cle) => (resultat[cle] = valeur));
  return resultat;
}

describe('DialogPubPartenaire', () => {
  let fixture: ComponentFixture<DialogPubPartenaire>;
  let composant: DialogPubPartenaire;
  let http: HttpTestingController;

  async function creer(mode: 'creation' | 'reconduction', publicite: PubliciteAdmin | null = null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DialogPubPartenaire],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigurationService, useValue: { apiUrl: API } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogPubPartenaire);
    composant = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('publicite', publicite);
    fixture.componentRef.setInput('formules', FORMULES);
    fixture.detectChanges();
  }

  function remplirCreation(): void {
    composant.partenaire.set({ id: 42, nom: 'Boulangerie Ferke' });
    composant.changerFormule('f-or');
    composant.titre.set('  Pain chaud  ');
    composant.description.set('Tous les matins');
    composant.image.set(new File(['x'], 'couverture.png', { type: 'image/png' }));
    composant.changerDateDebut('2026-12-01');
  }

  afterEach(() => http.verify());

  it('préremplit la date de fin selon la durée de la formule, et la laisse modifiable', async () => {
    await creer('creation');
    composant.changerDateDebut('2026-12-01');
    composant.changerFormule('f-or');
    expect(composant.dateFin()).toBe('2026-12-31');

    composant.changerFormule('f-argent');
    expect(composant.dateFin()).toBe('2026-12-08');
    expect(composant.dateFinModifiee()).toBeFalse();

    composant.changerDateFin('2026-12-20');
    expect(composant.dateFin()).toBe('2026-12-20');
    expect(composant.dateFinModifiee()).toBeTrue();
  });

  it('lit la durée sur /publicites/formules/ quand les quotas ne la donnent pas', async () => {
    await TestBed.configureTestingModule({
      imports: [DialogPubPartenaire],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ConfigurationService, useValue: { apiUrl: API } }],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogPubPartenaire);
    composant = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    const sansDuree = { ...FORMULES[0], duree_jours: undefined };
    fixture.componentRef.setInput('formules', [sansDuree]);
    fixture.detectChanges();

    http.expectOne(`${API}/publicites/formules/`).flush([{ id: 'f-or', duree_jours: 14 }]);
    composant.changerDateDebut('2026-12-01');
    composant.changerFormule('f-or');
    expect(composant.dateFin()).toBe('2026-12-15');
  });

  it('affiche les places restantes de chaque formule', async () => {
    await creer('creation');
    expect(composant.libelleFormule(FORMULES[0])).toBe('Or — 3 places restantes');
    expect(composant.libelleFormule(FORMULES[1])).toBe('Argent — complète');
  });

  it('exige le règlement : rien n’est envoyé sans « Payée » ou « Offerte »', async () => {
    await creer('creation');
    remplirCreation();
    composant.soumettre();

    http.expectNone(`${API}/publicites/admin/creer/`);
    expect(composant.erreursChamps()['reglement']).toBeTruthy();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Indiquez si la pub est « Payée » ou « Offerte »');
  });

  it('envoie la création avec le bon corps (offerte avec motif), sans date_fin non modifiée', async () => {
    await creer('creation');
    const reussi = jasmine.createSpy('reussi');
    composant.reussi.subscribe(reussi);
    remplirCreation();
    composant.changerReglement('offerte');
    composant.motif.set('  Partenaire historique ');
    composant.soumettre();

    const requete = http.expectOne(`${API}/publicites/admin/creer/`);
    expect(requete.request.method).toBe('POST');
    const corps = champs(requete.request.body as FormData);
    expect(corps['partenaire']).toBe('42');
    expect(corps['formule']).toBe('f-or');
    expect(corps['titre']).toBe('Pain chaud');
    expect(corps['description']).toBe('Tous les matins');
    expect((corps['image_couverture'] as File).name).toBe('couverture.png');
    expect(corps['date_debut']).toBe('2026-12-01');
    // Date de fin non modifiée par l'admin : pas envoyée, le serveur la calcule lui-même.
    expect(corps['date_fin']).toBeUndefined();
    expect(corps['reglement']).toBe('offerte');
    expect(corps['motif']).toBe('Partenaire historique');
    expect(corps['video']).toBeUndefined();
    expect(corps['portee']).toBeUndefined();

    requete.flush({ id: 'nouvelle' });
    expect(reussi).toHaveBeenCalled();
  });

  it('envoie date_fin seulement si l’admin l’a modifiée', async () => {
    await creer('creation');
    remplirCreation();
    composant.changerDateFin('2026-12-25');
    composant.changerReglement('payee');
    composant.soumettre();

    const corps = champs(http.expectOne(`${API}/publicites/admin/creer/`).request.body as FormData);
    expect(corps['date_fin']).toBe('2026-12-25');
  });

  it('n’envoie pas de motif pour une pub « Payée »', async () => {
    await creer('creation');
    remplirCreation();
    composant.changerReglement('offerte');
    composant.motif.set('motif');
    composant.changerReglement('payee');
    composant.soumettre();

    const corps = champs(http.expectOne(`${API}/publicites/admin/creer/`).request.body as FormData);
    expect(corps['reglement']).toBe('payee');
    expect(corps['motif']).toBeUndefined();
  });

  it('envoie la reconduction avec le bon corps après confirmation', async () => {
    await creer('reconduction', PUB_TERMINEE);
    // Formule d'origine (7 jours) retrouvée par son id.
    composant.changerDateDebut('2026-12-01');
    expect(composant.dateFin()).toBe('2026-12-08');

    composant.changerFormule('f-or');
    composant.changerReglement('payee');
    composant.soumettre();
    // Étape de confirmation : rien n'est encore parti.
    http.expectNone(`${API}/publicites/admin/pub-1/reconduire/`);
    expect(composant.etapeConfirmation()).toBeTrue();

    composant.envoyer();
    const requete = http.expectOne(`${API}/publicites/admin/pub-1/reconduire/`);
    expect(requete.request.method).toBe('POST');
    const corps = champs(requete.request.body as FormData);
    expect(corps['formule_id']).toBe('f-or');
    expect(corps['date_debut']).toBe('2026-12-01');
    // Date de fin non modifiée par l'admin : pas envoyée, le serveur la calcule lui-même.
    expect(corps['date_fin']).toBeUndefined();
    expect(corps['reglement']).toBe('payee');
    expect(corps['image_couverture']).toBeUndefined();
    expect(corps['motif']).toBeUndefined();
    requete.flush({});
  });

  it('affiche le message du serveur tel quel sans fermer la fenêtre (409 quota atteint)', async () => {
    await creer('creation');
    const reussi = jasmine.createSpy('reussi');
    const annule = jasmine.createSpy('annule');
    composant.reussi.subscribe(reussi);
    composant.annule.subscribe(annule);
    remplirCreation();
    composant.changerReglement('payee');
    composant.soumettre();

    http
      .expectOne(`${API}/publicites/admin/creer/`)
      .flush({ message: 'Quota de la formule « Or » atteint (5/5).' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(composant.erreurGenerale()).toBe('Quota de la formule « Or » atteint (5/5).');
    expect(fixture.nativeElement.textContent).toContain('Quota de la formule « Or » atteint (5/5).');
    expect(reussi).not.toHaveBeenCalled();
    expect(annule).not.toHaveBeenCalled();
  });

  it('affiche l’erreur de dates du serveur (400) sous le champ et en message', async () => {
    await creer('reconduction', PUB_TERMINEE);
    composant.changerDateDebut('2026-12-01');
    composant.changerReglement('payee');
    composant.soumettre();
    composant.envoyer();

    http
      .expectOne(`${API}/publicites/admin/pub-1/reconduire/`)
      .flush({ date_fin: ['La date de fin doit suivre la date de début.'] }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(composant.etapeConfirmation()).toBeFalse();
    expect(composant.erreursChamps()['date_fin']).toBe('La date de fin doit suivre la date de début.');
    expect(fixture.nativeElement.textContent).toContain('La date de fin doit suivre la date de début.');
  });
});
