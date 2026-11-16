import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { PublicitesAdmin } from './publicites-admin';
import { PublicitesAdminService } from './publicites-admin.service';
import { PermissionsService } from '../../../noyau/permissions/permissions.service';
import { PermissionsAdmin } from '../../../modeles/permissions-admin.model';
import { PubliciteAdmin, ReponseListePublicitesAdmin, StatsPublicitesAdmin } from '../../../modeles/publicites-admin.model';

const CLE_MODE_AFFICHAGE = 'poufiret-admin-publicites-mode-affichage';

// Le mode d'affichage est mémorisé dans localStorage (persiste entre les tests) : on repart
// toujours d'un état propre pour que ces tests restent indépendants les uns des autres.
afterEach(() => {
  try {
    localStorage.removeItem(CLE_MODE_AFFICHAGE);
  } catch {
    // Stockage indisponible : rien à nettoyer.
  }
});

const STATS: StatsPublicitesAdmin = { totaux: { nb_publicites: 2 }, publicites: [] };

function reponseListe(results: PubliciteAdmin[]): ReponseListePublicitesAdmin {
  return { count: results.length, next: null, previous: null, results };
}

const PUBLICITES_DEFAUT: PubliciteAdmin[] = [
  { id: 'p-terminee', titre: 'Campagne terminée', formule: 'Or', statut: 'terminee' },
  { id: 'p-active', titre: 'Campagne active', formule: 'Or', statut: 'active' },
];

/** Boutons « Créer une pub pour un partenaire » et « Reconduire » : capacité gerer_pubs_partenaires. */
describe('PublicitesAdmin — pubs créées pour un partenaire', () => {
  async function creer(permissions: PermissionsAdmin): Promise<ComponentFixture<PublicitesAdmin>> {
    const serviceFake = {
      chargerStats: () => of(STATS),
      chargerListe: () => of(reponseListe(PUBLICITES_DEFAUT)),
      chargerQuotasFormules: () => of([]),
    };
    await TestBed.configureTestingModule({
      imports: [PublicitesAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PublicitesAdminService, useValue: serviceFake },
        {
          provide: PermissionsService,
          useValue: {
            permissionsActuelles: () => permissions,
            aLaCapacite: (nom: string) => permissions.capacites[nom] ?? false,
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicitesAdmin);
    fixture.detectChanges();
    return fixture;
  }

  function boutons(fixture: ComponentFixture<PublicitesAdmin>): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).map((b) =>
      b.textContent!.trim(),
    );
  }

  it('masque « Créer une pub pour un partenaire » et « Reconduire » sans la capacité', async () => {
    const fixture = await creer({ role: 'admin', isStaff: true, isSuperuser: false, capacites: { valider_publicite: true } });
    const textes = boutons(fixture);
    expect(textes.some((t) => t.includes('Créer une pub pour un partenaire'))).toBeFalse();
    expect(textes).not.toContain('Reconduire');
  });

  it('affiche les deux boutons avec gerer_pubs_partenaires ; « Reconduire » seulement sur les terminées', async () => {
    const fixture = await creer({
      role: 'admin',
      isStaff: true,
      isSuperuser: false,
      capacites: { gerer_pubs_partenaires: true },
    });
    const textes = boutons(fixture);
    expect(textes.some((t) => t.includes('Créer une pub pour un partenaire'))).toBeTrue();
    expect(textes.filter((t) => t === 'Reconduire').length).toBe(1);
    const carteTerminee = fixture.nativeElement.querySelector('#pub-p-terminee') as HTMLElement;
    expect(carteTerminee.textContent).toContain('Reconduire');
  });

  it('affiche les boutons pour un super-admin', async () => {
    const fixture = await creer({ role: 'admin', isStaff: true, isSuperuser: true, capacites: {} });
    expect(boutons(fixture).some((t) => t.includes('Créer une pub pour un partenaire'))).toBeTrue();
  });

  it('après succès : message affiché, campagnes et quotas rechargés', async () => {
    const fixture = await creer({ role: 'admin', isStaff: true, isSuperuser: true, capacites: {} });
    const service = TestBed.inject(PublicitesAdminService);
    const stats = spyOn(service, 'chargerStats').and.returnValue(of(STATS));
    const liste = spyOn(service, 'chargerListe').and.returnValue(of(reponseListe(PUBLICITES_DEFAUT)));
    const quotas = spyOn(service, 'chargerQuotasFormules').and.returnValue(of([]));

    fixture.componentInstance.ouvrirCreationPubPartenaire();
    fixture.componentInstance.surPubPartenaireReussie('La pub « Pain » a été créée pour Ferke.');
    fixture.detectChanges();

    expect(fixture.componentInstance.dialogPubPartenaire()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('La pub « Pain » a été créée pour Ferke.');
    expect(stats).toHaveBeenCalled();
    expect(liste).toHaveBeenCalled();
    expect(quotas).toHaveBeenCalled();
  });
});

/** Mentions de reconduction (reconduite_le, reconduction_statut, reconduite_depuis_id, peut_etre_reconduite). */
describe('PublicitesAdmin — reconduction', () => {
  async function creer(publicites: PubliciteAdmin[]): Promise<ComponentFixture<PublicitesAdmin>> {
    const serviceFake = {
      chargerStats: () => of(STATS),
      chargerListe: () => of(reponseListe(publicites)),
      chargerQuotasFormules: () => of([]),
    };
    await TestBed.configureTestingModule({
      imports: [PublicitesAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PublicitesAdminService, useValue: serviceFake },
        {
          provide: PermissionsService,
          useValue: {
            permissionsActuelles: () => ({ role: 'admin', isStaff: true, isSuperuser: false, capacites: {} }),
            aLaCapacite: (nom: string) => nom === 'gerer_pubs_partenaires',
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicitesAdmin);
    fixture.detectChanges();
    return fixture;
  }

  it('masque « Reconduire » quand peut_etre_reconduite est false, même sur une campagne terminée', async () => {
    const fixture = await creer([
      { id: 'p1', titre: 'Campagne bloquée', formule: 'Or', statut: 'terminee', peut_etre_reconduite: false },
    ]);
    const carte = fixture.nativeElement.querySelector('#pub-p1') as HTMLElement;
    expect(carte.textContent).not.toContain('Reconduire');
  });

  it('affiche « Reconduite le… » avec la pastille du statut de la copie', async () => {
    const fixture = await creer([
      {
        id: 'p1',
        titre: 'Campagne reconduite',
        formule: 'Or',
        statut: 'terminee',
        reconduite_le: '2026-01-15',
        reconduction_statut: 'active',
      },
    ]);
    const carte = fixture.nativeElement.querySelector('#pub-p1') as HTMLElement;
    expect(carte.textContent).toContain('Reconduite le 15/01/2026');
    expect(carte.querySelector('.badge-active')?.textContent).toContain('Active');
  });

  it('« ↩ Reconduction » cliquable vers l\'original s\'il est chargé, simple mention sinon', async () => {
    const fixture = await creer([
      { id: 'original', titre: 'Originale', formule: 'Or', statut: 'terminee' },
      { id: 'copie-chargee', titre: 'Copie (original chargé)', formule: 'Or', statut: 'active', reconduite_depuis_id: 'original' },
      { id: 'copie-isolee', titre: 'Copie (original absent)', formule: 'Or', statut: 'active', reconduite_depuis_id: 'introuvable' },
    ]);

    const carteChargee = fixture.nativeElement.querySelector('#pub-copie-chargee') as HTMLElement;
    const lienChargee = carteChargee.querySelector('.lien-reconduction') as HTMLButtonElement | null;
    expect(lienChargee).not.toBeNull();
    expect(lienChargee!.textContent).toContain('Reconduction');

    const carteIsolee = fixture.nativeElement.querySelector('#pub-copie-isolee') as HTMLElement;
    expect(carteIsolee.querySelector('.lien-reconduction')).toBeNull();
    expect(carteIsolee.querySelector('.mention-reconduction')?.textContent).toContain('Reconduction');
  });
});

/** Pagination/filtres/tri/mode d'affichage (GET admin/liste/), URL et pub ciblée. */
describe('PublicitesAdmin — liste paginée', () => {
  async function creer(
    options: {
      publicites?: PubliciteAdmin[];
      count?: number;
      pubParId?: PubliciteAdmin | null;
      queryParams?: Record<string, string>;
    } = {},
  ): Promise<{ fixture: ComponentFixture<PublicitesAdmin> }> {
    const publicites = options.publicites ?? PUBLICITES_DEFAUT;
    const serviceFake = {
      chargerStats: () => of(STATS),
      chargerListe: () => of({ count: options.count ?? publicites.length, next: null, previous: null, results: publicites }),
      chargerQuotasFormules: () => of([]),
      chargerPubParId: () => of(options.pubParId ?? null),
    };

    // Fake ActivatedRoute/Router : `navigate()` réémet directement sur queryParamMap$, comme le
    // ferait une vraie navigation (naviguer() reconstruit toujours l'état complet, jamais un merge).
    const queryParamMap$ = new BehaviorSubject(convertToParamMap(options.queryParams ?? {}));
    const routeFake = { queryParamMap: queryParamMap$.asObservable() };
    const routerFake = {
      navigate: jasmine
        .createSpy('navigate')
        .and.callFake((_commandes: unknown[], extras?: { queryParams?: Record<string, unknown> }) => {
          const params: Record<string, string> = {};
          for (const [cle, valeur] of Object.entries(extras?.queryParams ?? {})) {
            if (valeur !== null && valeur !== undefined) {
              params[cle] = String(valeur);
            }
          }
          queryParamMap$.next(convertToParamMap(params));
          return Promise.resolve(true);
        }),
    };

    await TestBed.configureTestingModule({
      imports: [PublicitesAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PublicitesAdminService, useValue: serviceFake },
        { provide: ActivatedRoute, useValue: routeFake },
        { provide: Router, useValue: routerFake },
        {
          provide: PermissionsService,
          useValue: {
            permissionsActuelles: () => ({ role: 'admin', isStaff: true, isSuperuser: true, capacites: {} }),
            aLaCapacite: () => true,
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicitesAdmin);
    fixture.detectChanges();
    return { fixture };
  }

  it('affiche les cartes par défaut, puis bascule en tableau au clic', async () => {
    const { fixture } = await creer();
    expect(fixture.nativeElement.querySelector('.grille-publicites')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tableau-publicites-admin')).toBeNull();

    const boutonTableau = Array.from(
      fixture.nativeElement.querySelectorAll('.bascule-mode button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent!.includes('Tableau'))!;
    boutonTableau.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-tableau-publicites-admin')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.grille-publicites')).toBeNull();
  });

  it(
    'mode Tableau : les lignes affichent titre/partenaire/statut, et la pagination affiche ' +
      'total/page/listes remplies (même avec ?mode=tableau dès le chargement)',
    async () => {
      const publicites: PubliciteAdmin[] = [
        { id: 'p1', titre: 'Campagne A', partenaire_nom: 'Boulangerie Ferke', formule: 'Or', statut: 'terminee' },
        { id: 'p2', titre: 'Campagne B', partenaire_nom: 'Pizzeria Koné', formule: 'Argent', statut: 'active' },
      ];
      const { fixture } = await creer({ publicites, count: 48, queryParams: { mode: 'tableau' } });

      // Lignes du tableau : pas de composant hôte vide — le contenu de chaque ligne doit être présent.
      const table = fixture.nativeElement.querySelector('app-tableau-publicites-admin') as HTMLElement;
      expect(table).not.toBeNull();
      const ligne1 = table.querySelector('#pub-p1') as HTMLElement;
      expect(ligne1.textContent).toContain('Campagne A');
      expect(ligne1.textContent).toContain('Boulangerie Ferke');
      expect(ligne1.textContent).toContain('Terminée');
      const ligne2 = table.querySelector('#pub-p2') as HTMLElement;
      expect(ligne2.textContent).toContain('Campagne B');
      expect(ligne2.textContent).toContain('Pizzeria Koné');

      // Barre de pagination : sélecteurs remplis, total et page affichés.
      const pagination = fixture.nativeElement.querySelector('app-pagination-publicites-admin') as HTMLElement;
      expect(pagination).not.toBeNull();
      expect(pagination.querySelectorAll('#ppa-tri option').length).toBeGreaterThan(0);
      expect(pagination.querySelectorAll('#ppa-taille option').length).toBeGreaterThan(0);
      expect(pagination.textContent).toContain('48 résultats');
      expect(pagination.textContent).toContain('Page 1 /');
    },
  );

  it('pub ciblée trouvée sur la page chargée : pas d’encadré, simple surlignage', async () => {
    const { fixture } = await creer({ queryParams: { pub: 'p-terminee' } });
    expect(fixture.componentInstance.pubCiblee()).toBeNull();
    const carte = fixture.nativeElement.querySelector('#pub-p-terminee') as HTMLElement;
    expect(carte.classList.contains('carte-surlignee')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.encadre-pub-ciblee')).toBeNull();
  });

  it('pub ciblée absente de la page chargée : encadré « Campagne ciblée » chargé à part', async () => {
    const pubCiblee: PubliciteAdmin = { id: 'ailleurs', titre: 'Campagne ailleurs', formule: 'Or', statut: 'rejetee' };
    const { fixture } = await creer({ queryParams: { pub: 'ailleurs' }, pubParId: pubCiblee });
    fixture.detectChanges();

    expect(fixture.componentInstance.pubCiblee()?.id).toBe('ailleurs');
    const encadre = fixture.nativeElement.querySelector('.encadre-pub-ciblee') as HTMLElement;
    expect(encadre).not.toBeNull();
    expect(encadre.textContent).toContain('Campagne ailleurs');

    const boutonFermer = encadre.querySelector('.bouton-fermer-encadre') as HTMLButtonElement;
    boutonFermer.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.encadre-pub-ciblee')).toBeNull();
  });

  it('pub ciblée introuvable (ni sur la page, ni via l’id) : pas d’erreur, pas d’encadré', async () => {
    const { fixture } = await creer({ queryParams: { pub: 'inconnue' }, pubParId: null });
    fixture.detectChanges();
    expect(fixture.componentInstance.pubCiblee()).toBeNull();
    expect(fixture.nativeElement.querySelector('.encadre-pub-ciblee')).toBeNull();
    expect(fixture.nativeElement.querySelector('.etat-erreur')).toBeNull();
  });

  it('pastille « Partenaire : … ✕ » quand ?partenaire est actif, retirée au clic', async () => {
    const { fixture } = await creer({
      queryParams: { partenaire: '42', partenaireNom: 'Boulangerie Ferke' },
    });
    const pastille = fixture.nativeElement.querySelector('.pastille-partenaire') as HTMLElement;
    expect(pastille).not.toBeNull();
    expect(pastille.textContent).toContain('Boulangerie Ferke');

    (pastille.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.filtres().partenaireId).toBeNull();
  });
});
