const app = require('express')();
const server = require('http').Server(app);
var io = require('socket.io')(server);
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const whitelist = ['http://localhost:4200'];
const Hand = require('pokersolver').Hand;
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if(whitelist.includes(origin))
      return callback(null, true)

      callback(new Error('Not allowed by CORS'));
  }
}
app.use(cors(corsOptions));

const genBaseSeat = () => {
  return {
    chipCount: 10000,
    dealer: false,
    bb: false,
    sb: false,
    cards: [],
    playing: false,
    currentAction: false,
    folded: false,
    actionTaken: '',
    betAmount: 0,
    blindMet: false,
    metCallableAction: false,
    handActive: false,
    bestHand: '',
    lost: false,
    prePotChipAmount: 0,
  };
}

const gameState = {
  active: false,
  currentUserAction: {},
  betTotal: 0,
  callableAction: false,
  flopRevealed: false,
  riverRevealed: false,
  turnRevealed: false,
  potAmount: 0,
  allInAmount: 0,
  smallBlind: 5,
  bigBlind: 10,
  bigBlindConfirmed: false,
  communityCards: [],
  burnCards: [],
  revealCards: true,
}

function buildSeats() {
  const seats = [];
  for (let i = 0; i < 10; i++) {
    seats.push({
      position: i + 1,
      ...genBaseSeat()
    });
  };
  return seats;
};

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
};


function dealCards() {
  currentDeck = shuffle(deck);

  seats.forEach((seat) => {
    seat.cards.push(currentDeck.splice(0, 1)[0]);
    if (!seat.lost) {
      seat.handActive = true;
    }
  });
  seats.forEach((seat) => {
    seat.cards.push(currentDeck.splice(0, 1)[0]);
  });

  startRound();

  io.emit('seats', seats);
  io.emit('gameState', gameState);
}

const startRound = () => {
  seats.forEach(seat => {
    seat.actionTaken = '';
    seat.metCallableAction = false;
  });
  gameState.callableAction = false;
  gameState.betTotal = gameState.bigBlind;
  gameState.allInAmount = 0;
  gameState.revealCards = false;
  const lastIndex = seats.length - 1;
  let startIndex;

  if (gameState.flopRevealed) {
    startIndex = findNextUpIndex(lastIndex);
  } else {
    startIndex = findNextUpIndex(1);
  }
  seats[startIndex].currentAction = true;
  gameState.currentUserAction = seats[startIndex];
};

const actionTaken = (action, amount, uuid) => {
  const currentPlayerIndex = seats.findIndex(seat => seat.uuid === uuid);
  let nextUpIndex;
  seats.forEach(seat => {
    if (seat.uuid === uuid) {
      seat.actionTaken = action;
      seat.currentAction = false;
      if (seat.bb) {
        gameState.bigBlindConfirmed = true;
      }
      switch(action) {
        case 'fold':
          seat.folded = true;
          seat.cards = [];
          seat.handActive = false;
          break;
        case 'call':
          if (gameState.allInAmount > 0) {
            if (seat.chipCount > gameState.allInAmount) {
              seat.chipCount -= amount;
              gameState.potAmount += amount;
            } else {
              gameState.potAmount += seat.chipCount;
              seat.chipCount = 0;
            }
          } else {
            const additionalChips = gameState.betTotal - seat.prePotChipAmount;
            // console.log('bet total: ', gameState.betTotal);
            // console.log('prepot chips: ', seat.prePotChipAmount);
            // console.log('additional chips: ', additionalChips);
            seat.prePotChipAmount += additionalChips;
            seat.chipCount -= additionalChips;
          }
          console.log('bet total: ', gameState.betTotal);
          if (gameState.betTotal >= gameState.bigBlind) {
            seat.blindMet = true;
          }
          if (seat.sb) {
            if (gameState.betTotal >= gameState.smallBlind) {
              seat.blindMet = true;
            }
          }
          seat.metCallableAction = true;
          break;
        case 'raise':
          seat.chipCount -= amount;
          seat.prePotChipAmount += amount;
          gameState.betTotal = seat.prePotChipAmount;
          gameState.callableAction = true;
          seat.metCallableAction = true;
          seat.blindMet = true;
          seats.forEach(seat => {
            if (seat.uuid !== uuid) {
              seat.metCallableAction = false;
            }
          })
          break;
        case 'check':
          seat.actionTaken = 'check';
          break;
        case 'all in':
          seat.prePotChipAmount += seat.chipCount;
          gameState.betTotal += seat.chipCount;
          gameState.allInAmount = seat.chipCount;
          seat.chipCount = 0;
          gameState.callableAction = true;
          seat.metCallableAction = true;
          seats.forEach(seat => {
            if (seat.uuid !== uuid) {
              seat.metCallableAction = false;
            }
          })
          break;
      }
    }
  });
  const callableActionsLeft = seats
    .filter(seat => !seat.metCallableAction && seat.handActive).length;
  const actionsLeft = seats
    .filter(seat => seat.actionTaken.length === 0 && seat.handActive).length;
  const playersInHand = seats.filter(seat => seat.handActive).length;
  // console.log('callable actions left: ', callableActionsLeft);
  // console.log('actions left', actionsLeft);
  // console.log('all in amount: ', gameState.allInAmount);
  // console.log('players in hand: ', playersInHand);
  if ((gameState.callableAction && callableActionsLeft > 0) || actionsLeft > 0) {
    nextUpIndex = findNextUpIndex(currentPlayerIndex);
    seats[nextUpIndex].currentAction = true;
    const nextPlayerUp = seats[nextUpIndex];
    gameState.currentUserAction = nextPlayerUp;
  } else if (!gameState.bigBlindConfirmed) {
    const index = seats.findIndex(seat => seat.bb);
    seats[index].currentAction = true;
    gameState.currentUserAction = seats[index];
  } else if (gameState.allInAmount > 0 && playersInHand === 2) {
    // console.log('RUN DOWN REST OF THE CARDS');
    gameState.revealCards = true;
    if (!gameState.flopRevealed) {
      revealFlop(false);
    }
    if (!gameState.turnRevealed) {
      revealTurn(false);
    }
    if (!gameState.riverRevealed) {
      revealRiver(false);
    }
    determineWinner();
  } else if (!gameState.flopRevealed) {
    revealFlop();
  } else if (!gameState.turnRevealed) {
    revealTurn();
  } else if (!gameState.riverRevealed) {
    revealRiver();
  } else {
    determineWinner();
  }
  io.emit('seats', seats);
  io.emit('gameState', gameState);
};

const initGame = () => {
  seats = seats.filter(seat => seat.playing);
  const randomIndex = Math.floor(Math.random() * seats.length);
  const beg = seats.slice(randomIndex);
  const end = seats.slice(0, randomIndex);
  seats = beg.concat(end);
  let dealerAssigned = false;
  let sbAssigned = false;
  let bbAssigned = false;
  seats.forEach((seat) => {
    if (!dealerAssigned) {
      seat.dealer = true;
      dealerAssigned = true;
    } else if (!sbAssigned) {
      seat.sb = true;
      seat.chipCount -= gameState.smallBlind;
      seat.prePotChipAmount += gameState.smallBlind;
      seat.betAmount += gameState.smallBlind;
      sbAssigned = true;
    } else if (!bbAssigned) {
      seat.bb = true;
      seat.chipCount -= gameState.bigBlind;
      seat.prePotChipAmount += gameState.bigBlind;
      seat.betAmount += gameState.bigBlind;
      seat.metCallableAction = true;
      seat.blindMet = true;
      bbAssigned = true;
    }
  });
  const dealer = seats.shift();
  seats.push(dealer);
  // gameState.potAmount += (gameState.smallBlind + gameState.bigBlind);
  // seats.sort((a, b) => a.position - b.position);
};

const revealFlop = (startNextRound = true) => {
  console.log('revealFlop');
  gameState.burnCards.push(currentDeck.splice(0, 1)[0]);
  gameState.communityCards.push(currentDeck.splice(0, 1)[0]);
  gameState.communityCards.push(currentDeck.splice(0, 1)[0]);
  gameState.communityCards.push(currentDeck.splice(0, 1)[0]);
  gameState.flopRevealed = true;
  gameState.betTotal = 0;
  let totalPrePotAmount = 0;
  seats.forEach(seat => totalPrePotAmount += seat.prePotChipAmount);
  gameState.potAmount += totalPrePotAmount;
  seats.forEach(seat => seat.prePotChipAmount = 0);
  if (startNextRound) {
    startRound();
  }
  io.emit('gameState', gameState);
};

const revealTurn = (startNextRound = true) => {
  console.log('revealTurn');
  gameState.burnCards.push(currentDeck.splice(0, 1)[0]);
  gameState.communityCards.push(currentDeck.splice(0, 1)[0]);
  gameState.turnRevealed = true;
  gameState.betTotal = 0;
  let totalPrePotAmount = 0;
  seats.forEach(seat => totalPrePotAmount += seat.prePotChipAmount);
  gameState.potAmount += totalPrePotAmount;
  seats.forEach(seat => seat.prePotChipAmount = 0);
  if (startNextRound) {
    startRound();
  }
  io.emit('gameState', gameState);
};

const revealRiver = (startNextRound = true) => {
  console.log('revealRiver');
  gameState.burnCards.push(currentDeck.splice(0, 1)[0]);
  gameState.communityCards.push(currentDeck.splice(0, 1)[0]);
  gameState.riverRevealed = true;
  gameState.betTotal = 0;
  let totalPrePotAmount = 0;
  seats.forEach(seat => totalPrePotAmount += seat.prePotChipAmount);
  gameState.potAmount += totalPrePotAmount;
  seats.forEach(seat => seat.prePotChipAmount = 0);
  if (startNextRound) {
    startRound();
  }
  io.emit('gameState', gameState);
};

const determineWinner = () => {
  console.log('determineWinner');
  gameState.revealCards = true;
  let totalPrePotAmount = 0;
  seats.forEach(seat => totalPrePotAmount += seat.prePotChipAmount);
  gameState.potAmount += totalPrePotAmount;
  const players = seats.filter(seat => seat.handActive);
  const solve = [];
  players.forEach(player => {
    const cards = Array.from(gameState.communityCards);
    cards.push(player.cards[0]);
    cards.push(player.cards[1]);
    const formatted = cards.map(card => `${card.value}${card.suit.toLowerCase()}`);
    // console.log('formatted: ', formatted);
    player.bestHand = Hand.solve(formatted);
    player.bestHand.uuid = player.uuid;
    solve.push(player.bestHand);
  });
  const winner = Hand.winners(solve)[0];
  seats.forEach(seat => {
    if (winner.uuid === seat.uuid) {
      seat.chipCount += gameState.potAmount;
    };
    if (seat.chipCount <= 0) {
      seat.lost = true;
    }
  });
  // seats = seats.filter(seat => seat.chipCount > 0);
};

const findNextUpIndex = (index) => {
  const result = seats.findIndex((seat, i) => {
    if (i > index) {
      return seat.handActive;
    }
    return false;
  });
  if (result > 0) {
    return result;
  }
  return seats.findIndex(seat => seat.handActive);
}

const deck = require('./deck.json');
let seats = buildSeats();
let currentDeck;

app.get('/api/seats', (req, res) => {
  res.send(seats);
});

app.get('/api/reserveSeat', (req, res) => {
  const { position, name, uuid } = req.query;
  const currentUser = seats.find(seat => seat.uuid === uuid);

  if (currentUser) {
    seats = seats.map((seat) => {
      if (seat.position == currentUser.position) {
        seat = {
          position: currentUser.position,
          ...genBaseSeat()
        }
      }
      return seat;
    })
  }

  seats.forEach((seat, i, c) => {
    if (c[i].position == position) {
      c[i].name = name;
      c[i].uuid = uuid;
      c[i].playing = true;
    }
  });

  io.emit('seats', seats);
  res.send(seats);
});

io.on('connection', (socket) => {
  socket.emit('seats', seats);
  socket.emit('connection', {
    seats,
    uuid_key: uuidv4(),
    gameState,
  });
  socket.on('disconnect', (data) => {

  });
  socket.on('startGame', (data) => {
    gameState.active = true;
    socket.emit('gameState', gameState);
    initGame();
    dealCards();
  });
  socket.on('actionTaken', data => {
    actionTaken(data.type, data.amount, data.uuid);
  });
});


server.listen(process.env.PORT || 8000, () => console.log(`Poker app listening on port ${process.env.PORT || 8000}`));
