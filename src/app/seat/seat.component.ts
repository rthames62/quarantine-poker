import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ReserveSeat, Seat } from '../shared/seats.service';
import { GameService, GameState } from '../shared/game.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'qp-seat',
  templateUrl: './seat.component.html',
  styleUrls: ['./seat.component.scss']
})
export class SeatComponent implements OnInit {
  @Input() public seat: Seat;

  @Output() public reserveTriggered = new EventEmitter<ReserveSeat>();

  public gameState$: Observable<GameState>;

  constructor(
    private gameService: GameService,
  ) { }

  ngOnInit(): void {
    this.gameState$ = this.gameService.getGameState();
  }

  public reserveSeat() {
    const name = prompt('Please enter your name');

    if (name) {
      this.reserveTriggered.emit({
        position: this.seat.position,
        name,
      });
    }
  }
}
