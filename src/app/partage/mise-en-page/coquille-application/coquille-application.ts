import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { EnTete } from '../en-tete/en-tete';
import { BarreLaterale } from '../barre-laterale/barre-laterale';

/**
 * Coquille applicative affichée après connexion : en-tête + menu latéral + contenu de la route active.
 */
@Component({
  selector: 'app-coquille-application',
  imports: [RouterOutlet, EnTete, BarreLaterale],
  templateUrl: './coquille-application.html',
  styleUrl: './coquille-application.scss',
})
export class CoquilleApplication {}
