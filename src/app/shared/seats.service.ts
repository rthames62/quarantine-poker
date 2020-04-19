import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';
import { map, tap, switchMap } from 'rxjs/operators';

export interface Seat {
  position: number;
  name?: string;
  chipCount?: number;
  uuid: string;
  playing: boolean;
  me: boolean;
  cards: Card[];
  bb: boolean;
  sb: boolean;
  dealer: boolean;
  currentAction: boolean;
  betAmount: number;
  blindMet: boolean;
  bestHand: string;
  lost: boolean;
  prePotChipAmount: number;
}

export interface Card {
  value: string;
  suit: string;
}

export interface ReserveSeat {
  position: number;
  name: string;
}

const base_uri = 'http://localhost:8000';

@Injectable({
  providedIn: 'root'
})
export class SeatsService {

  private seats$ = new BehaviorSubject<Seat[]>([]);

  public uuid: string;

  constructor(
    private http: HttpClient,
    private socket: Socket,
  ) {
    this.socket.on('connection', (res) => {
      const uuid = localStorage.getItem('uuid');
      if (!uuid) {
        localStorage.setItem('uuid', res.uuid_key);
        this.uuid = res.uuid_key;
      } else {
        this.uuid = uuid;
      }
      res.seats.forEach(seat => {
        if (seat.uuid === this.uuid) {
          seat.me = true;
        }
      });
      this.seats$.next(res.seats);
    });
    this.socket.on('seats', (newSeats) => {
      newSeats.forEach(seat => {
        if (seat.uuid === this.uuid) {
          seat.me = true;
        }
      });
      console.log('from socked seats: ', newSeats);
      this.seats$.next(newSeats);
    });
  }

  public getSeats(): Observable<Seat[]> {
    return this.http.get<Seat[]>(`${base_uri}/api/seats`).pipe(
      tap(seats => this.seats$.next(seats)),
      switchMap(() => this.seats$),
    );
  }

  public reserveSeat(reserveSeat: ReserveSeat): Observable<Seat[]> {
    return this.http.get<Seat[]>(
      `${base_uri}/api/reserveSeat?position=${reserveSeat.position}&name=${reserveSeat.name}&uuid=${this.uuid}`
    ).pipe(
      tap(seats => {
        this.seats$.next(seats);
      }),
    );
  }
}
