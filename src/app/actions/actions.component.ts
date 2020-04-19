import { Component, OnInit, Input } from '@angular/core';
import { GameState, GameService } from '../shared/game.service';
import { Seat } from '../shared/seats.service';

@Component({
  selector: 'qp-actions',
  templateUrl: './actions.component.html',
  styleUrls: ['./actions.component.scss']
})
export class ActionsComponent implements OnInit {
  @Input() public gameState: GameState;

  @Input() public seats: Seat[];

  public mySeat: Seat;

  constructor(
    private gameService: GameService,
  ) {

  }

  ngOnInit(): void {
    console.log(this.gameState);
    console.log(this.seats);
    this.mySeat = this.seats.find(seat => seat.me);
    console.log(this.mySeat);
  }

  public action(
    type: 'fold' | 'call' | 'check' | 'raise' | 'all in',
    amount?: string,
  ): void {
    this.gameService.dispatchAction(type, parseInt(amount));
  }
}
