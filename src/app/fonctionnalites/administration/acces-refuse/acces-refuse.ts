import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Page affichée par capaciteGuard quand l'admin connecté n'a pas la capacité requise. */
@Component({
  selector: 'app-acces-refuse',
  imports: [RouterLink],
  templateUrl: './acces-refuse.html',
  styleUrl: './acces-refuse.scss',
})
export class AccesRefuse {}
