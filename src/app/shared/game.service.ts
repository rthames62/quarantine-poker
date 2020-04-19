import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Seat, SeatsService, Card } from './seats.service';
import { Observable, ReplaySubject, BehaviorSubject } from 'rxjs';

export interface GameState {
  active: boolean;
  currentUserAction: Seat;
  callableAction: boolean;
  flopRevealed: boolean;
  riverRevealed: boolean;
  turnRevealed: boolean;
  potAmount: number;
  smallBlind: number;
  bigBlind: number;
  betTotal: number;
  communityCards: Card[];
  allInOccured: number;
  revealCards: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {

  private gameState$ = new ReplaySubject<GameState>();

  private isMyTurn$ = new BehaviorSubject<boolean>(false);

  constructor(
    private socket: Socket,
    private seatService: SeatsService,
  ) {
    this.socket.on('connection', (response) => {
      console.log(response.gameState);
      this.validateIsMyturn(response.gameState, this.seatService.uuid);
      this.gameState$.next(response.gameState);
    });
    this.socket.on('gameState', (data: GameState) => {
      console.log('game service from on gameState', data);
      this.validateIsMyturn(data, this.seatService.uuid);
      this.gameState$.next(data);
    });
  }

  public startGame(): void {
    this.socket.emit('startGame');
  }

  public getGameState(): Observable<GameState> {
    return this.gameState$;
  }

  public isMyTurn(): Observable<boolean> {
    return this.isMyTurn$;
  }

  public dispatchAction(type: string, amount = 0): void {
    this.socket.emit('actionTaken', {
      type,
      amount,
      uuid: this.seatService.uuid,
    });
  }

  private validateIsMyturn(data: GameState, uuid: string): void {
    if (data.currentUserAction.uuid === uuid) {
      this.isMyTurn$.next(true);
    } else {
      this.isMyTurn$.next(false);
    }
  }
}
