import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';

import { AjoutPhotos, TeleverserPhoto } from './ajout-photos';

function image(nom: string): File {
  return new File(['x'], nom, { type: 'image/png' });
}

describe('AjoutPhotos', () => {
  let fixture: ComponentFixture<AjoutPhotos>;
  let composant: AjoutPhotos;
  let envois: { fichier: string; principale: boolean }[];

  async function creer(nbPhotos: number, plafond: number | null, televerser?: TeleverserPhoto): Promise<void> {
    await TestBed.configureTestingModule({ imports: [AjoutPhotos] }).compileComponents();
    fixture = TestBed.createComponent(AjoutPhotos);
    composant = fixture.componentInstance;
    envois = [];
    fixture.componentRef.setInput('nbPhotos', nbPhotos);
    fixture.componentRef.setInput('plafond', plafond);
    fixture.componentRef.setInput(
      'televerser',
      televerser ??
        ((fichier: File, principale: boolean): Observable<unknown> => {
          envois.push({ fichier: fichier.name, principale });
          return of({ id: envois.length });
        }),
    );
    fixture.detectChanges();
  }

  function choisirFichiers(fichiers: File[]): void {
    const transfert = new DataTransfer();
    fichiers.forEach((f) => transfert.items.add(f));
    const entree = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    entree.files = transfert.files;
    entree.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function boutonAjouter(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.bouton-ajouter') as HTMLButtonElement;
  }

  it('affiche le compteur « n / max »', async () => {
    await creer(2, 4);
    expect(fixture.nativeElement.textContent).toContain('2 / 4 photos');
    expect(boutonAjouter().disabled).toBeFalse();
  });

  it('désactive l’ajout quand le plafond est atteint', async () => {
    await creer(3, 3);
    expect(fixture.nativeElement.textContent).toContain('3 / 3 photos');
    expect(boutonAjouter().disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Nombre maximum de photos atteint');
  });

  it('accepte plusieurs photos dans la limite des places restantes et les envoie une par une', async () => {
    await creer(1, 3);
    choisirFichiers([image('a.png'), image('b.png'), image('c.png')]);
    expect(composant.selection().length).toBe(2);
    expect(composant.messageErreur()).toContain('2 photo(s) retenue(s)');

    composant.premierePrincipale.set(true);
    const ajoutees: unknown[] = [];
    composant.ajoutee.subscribe((r) => ajoutees.push(r));
    composant.envoyer();

    expect(envois).toEqual([
      { fichier: 'a.png', principale: true },
      { fichier: 'b.png', principale: false },
    ]);
    expect(ajoutees.length).toBe(2);
    expect(composant.selection().length).toBe(0);
  });

  it('affiche le message d’erreur du serveur tel quel à l’ajout', async () => {
    const erreur = new HttpErrorResponse({
      status: 400,
      error: { image: ['Cet article a déjà 4 photos (maximum de la catégorie Mode).'] },
    });
    await creer(0, 4, () => throwError(() => erreur));
    choisirFichiers([image('a.png')]);
    composant.envoyer();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cet article a déjà 4 photos (maximum de la catégorie Mode).');
    // La photo non envoyée reste sélectionnée pour un nouvel essai.
    expect(composant.selection().length).toBe(1);
  });

  it('affiche le message global du serveur (ex. 409) tel quel', async () => {
    const erreur = new HttpErrorResponse({ status: 409, error: { message: 'Plafond de photos atteint.' } });
    await creer(0, 2, () => throwError(() => erreur));
    choisirFichiers([image('a.png')]);
    composant.envoyer();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Plafond de photos atteint.');
  });

  it('sans plafond connu : simple nombre de photos, ajout possible', async () => {
    await creer(2, null);
    expect(fixture.nativeElement.textContent).toContain('2 photos');
    expect(boutonAjouter().disabled).toBeFalse();
  });

  it('bloque un nouvel envoi pendant l’envoi en cours', async () => {
    const reponse = new Subject<unknown>();
    let appels = 0;
    await creer(0, 4, () => {
      appels++;
      return reponse;
    });
    choisirFichiers([image('a.png')]);
    composant.envoyer();
    composant.envoyer();
    expect(appels).toBe(1);
    reponse.next({});
    reponse.complete();
  });
});
