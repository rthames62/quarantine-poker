import { Component } from '@angular/core';
import { GameService } from './shared/game.service';

@Component({
  selector: 'qp-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'quarantine-poker';

  public constructor(
    private gameService: GameService,
  ) {}

  public startGame(): void {
    this.gameService.startGame();
  }
}
