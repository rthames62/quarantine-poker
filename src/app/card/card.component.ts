import { Component, OnInit, Input } from '@angular/core';
import { Seat } from '../shared/seats.service';
import { GameState } from '../shared/game.service';

@Component({
  selector: 'qp-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {
  @Input() public seat: Seat;

  @Input() public gameState: GameState;

  constructor() { }

  ngOnInit(): void {

  }

}
