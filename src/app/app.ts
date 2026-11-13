import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BandeauNouvelleVersion } from './partage/mise-en-page/bandeau-nouvelle-version/bandeau-nouvelle-version';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BandeauNouvelleVersion],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
