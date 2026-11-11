import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DialogCategorie } from './dialog-categorie';
import { CategoriesAdminService } from '../categories-admin.service';
import { ConfigurationService } from '../../../../noyau/config/configuration.service';
import { CategorieAdmin, RequeteCategorieAdmin } from '../../../../modeles/categorie-admin.model';

const CATEGORIE: CategorieAdmin = {
  id: 7,
  nom: 'Mode',
  slug: 'mode',
  description: '',
  icone: null,
  image: null,
  ordre: 0,
  est_active: true,
  est_archivee: false,
  parent_id: null,
  parent_nom: null,
  types_partenaire: [],
  mots_cles: [],
  nb_partenaires: 0,
  nb_enfants: 0,
  affichage_enfants: 'pastilles',
  max_photos_par_article: 3,
};

describe('DialogCategorie — nombre maximum de photos par article', () => {
  let fixture: ComponentFixture<DialogCategorie>;

  async function creer(categorie: CategorieAdmin | null): Promise<RequeteCategorieAdmin[]> {
    await TestBed.configureTestingModule({ imports: [DialogCategorie] }).compileComponents();
    fixture = TestBed.createComponent(DialogCategorie);
    fixture.componentRef.setInput('categorie', categorie);
    const emis: RequeteCategorieAdmin[] = [];
    fixture.componentInstance.soumis.subscribe((corps) => emis.push(corps));
    fixture.detectChanges();
    return emis;
  }

  function choisir(valeur: string): void {
    const select = fixture.nativeElement.querySelector('#max-photos-categorie') as HTMLSelectElement;
    select.value = valeur;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('propose Vide, 1, 2, 3, 4 avec l’aide attendue', async () => {
    await creer(null);
    const options = Array.from(
      (fixture.nativeElement.querySelector('#max-photos-categorie') as HTMLSelectElement).options,
    ).map((o) => o.textContent!.trim());
    expect(options).toEqual(['Vide', '1', '2', '3', '4']);
    expect(fixture.nativeElement.textContent).toContain(
      "Vide : selon l'abonnement du vendeur. S'applique aussi aux sous-catégories qui n'ont pas leur",
    );
  });

  it('envoie la valeur choisie', async () => {
    const emis = await creer(null);
    fixture.componentInstance.nom.set('Chaussures');
    choisir('4');
    fixture.componentInstance.soumettre();
    expect(emis[0].max_photos_par_article).toBe(4);
  });

  it('envoie null quand le champ est vide, y compris pour vider un réglage existant', async () => {
    const emis = await creer(CATEGORIE);
    expect(fixture.componentInstance.maxPhotosParArticle()).toBe(3);
    choisir('');
    fixture.componentInstance.soumettre();
    expect(emis[0].max_photos_par_article).toBeNull();
  });
});

describe('CategoriesAdminService — champ max_photos_par_article', () => {
  const API = 'https://api.test/api/v1';

  function corpsEnvoye(donnees: RequeteCategorieAdmin): Record<string, FormDataEntryValue> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ConfigurationService, useValue: { apiUrl: API } }],
    });
    TestBed.inject(CategoriesAdminService).modifier(7, donnees).subscribe();
    const requete = TestBed.inject(HttpTestingController).expectOne((r) => r.method === 'PATCH');
    const champs: Record<string, FormDataEntryValue> = {};
    (requete.request.body as FormData).forEach((v, k) => (champs[k] = v));
    requete.flush(CATEGORIE);
    return champs;
  }

  it('envoie la valeur en texte', () => {
    expect(corpsEnvoye({ nom: 'Mode', max_photos_par_article: 2 })['max_photos_par_article']).toBe('2');
  });

  it('envoie une chaîne vide pour « Vide » (null)', () => {
    expect(corpsEnvoye({ nom: 'Mode', max_photos_par_article: null })['max_photos_par_article']).toBe('');
  });

  it('n’envoie pas le champ s’il est absent de la requête', () => {
    expect(corpsEnvoye({ nom: 'Mode' })['max_photos_par_article']).toBeUndefined();
  });
});
