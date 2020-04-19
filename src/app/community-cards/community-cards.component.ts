import { Component, OnInit, Input } from '@angular/core';
import { GameState } from '../shared/game.service';

@Component({
  selector: 'qp-community-cards',
  templateUrl: './community-cards.component.html',
  styleUrls: ['./community-cards.component.scss']
})
export class CommunityCardsComponent implements OnInit {
  @Input() gameState: GameState;

  constructor() { }

  ngOnInit(): void {
  }

}
