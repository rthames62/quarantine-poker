import { Component, OnInit } from '@angular/core';
import { SeatsService, Seat, ReserveSeat } from '../shared/seats.service';
import { Observable } from 'rxjs';
import { tap, take } from 'rxjs/operators';
import { GameService, GameState } from '../shared/game.service';

@Component({
  selector: 'qp-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {

  public seats$: Observable<Seat[]>;

  public gameState$: Observable<GameState>;

  public isMyTurn$: Observable<boolean>;

  constructor(
    private seatsService: SeatsService,
    private gameService: GameService,
  ) { }

  ngOnInit(): void {
    this.seats$ = this.seatsService.getSeats();
    this.gameState$ = this.gameService.getGameState();
    this.isMyTurn$ = this.gameService.isMyTurn();
  }

  public reserveSeat(event: ReserveSeat) {
    this.seatsService.reserveSeat(event).pipe(
      take(1),
    ).subscribe();
  }
}
