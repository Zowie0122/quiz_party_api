require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const {
  getNewGame,
  addNewPlayer,
  formatGameInfo,
  calWinCounts,
  clearQuiz,
  resetGame,
  getGameCodeByMasterId,
  getGameCodeByPlayerId,
  removePlayer,
} = require('./utils/game');
const quizs = require('./db/dammyData');
const { getRandomNumber } = require('./utils/number');
const { time } = require('console');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const onGoingGames = {};

// make a new game
app.post('/new', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) throw new Error('The master must provide a display name.');

    // generate a new game id
    const gameCode = uuidv4();

    // register and initialize a new game with master info
    // generate master identifier
    const mid = uuidv4();

    onGoingGames[gameCode] = getNewGame(mid, name);

    res.status(200).json({ gameCode, mid });
  } catch (err) {
    res.status(400).json({ error: err });
  }
});

io.on('connection', (socket) => {
  console.log(`${socket.id} connection started`);

  // when master / players join a game
  socket.on('join', ({ gameCode, name, mid }, callback) => {
    const game = onGoingGames[gameCode];
    if (!game) {
      return;
      // return callback({
      //   status: 404,
      //   error: "Game not found."
      // })
    }

    // identify if it is master or player
    if (mid && mid === game.master?.mid) {
      game.master.id = socket.id;
    } else {
      // add as a player and initial set up the initial state
      addNewPlayer(onGoingGames[gameCode], socket.id, name);
    }

    socket.join(gameCode);

    // notify the player's own id within the game room
    io.to(socket.id).emit('idNotification', socket.id);

    io.to(gameCode).emit('updatedGame', {
      game: formatGameInfo(game),
    });
  });

  // master generate a new quiz
  socket.on('new quiz', ({ gameCode, mid, isRandom, quiz }) => {
    const game = onGoingGames[gameCode];
    // only master could raise a new quiz
    if (!game || !mid || mid !== game.master.mid) {
      // show error
      return;
    }

    if (game.showBingo) game.showBingo = false

    if (isRandom) {
      // TODO: get the random quiz from mongo
      game.quiz = quizs[getRandomNumber(quizs.length)];
    } else if (!quiz) {
      return
    } else {
      game.quiz = quiz
    }

    io.to(gameCode).emit('updatedGame', {
      game: formatGameInfo(game),
    });

    // TODO: make it available for master to decide
    let timeleft = 15;
    let downloadTimer = setInterval(function () {
      timeleft -= 1;
      if (timeleft <= 0) {
        clearInterval(downloadTimer);
      }
      io.to(gameCode).emit('counter', {
        timeleft
      });
      if (timeleft === 0) {
        game.showBingo = true;
        calWinCounts(game);

        io.to(gameCode).emit('updatedGame', {
          game: formatGameInfo(game, false),
        });
      }
    }, 1000);

  });

  // a player selects an answer
  socket.on('select', ({ gameCode, answer }) => {
    const game = onGoingGames[gameCode];

    // player can't select while the current quiz is under revealed
    if (!game || game.showBingo) {
      // error
      return;
    }
    game.players.find((player) => player.id === socket.id).answer = answer;
  });

  // master / timer forces to show bingo
  socket.on('show bingo', ({ gameCode, mid }) => {
    const game = onGoingGames[gameCode];

    // only master could clear / reset game
    if (!game || game.showBingo || !mid || mid !== game.master.mid) {
      // show error
      return;
    }

    game.showBingo = true;
    calWinCounts(game);

    io.to(gameCode).emit('updatedGame', {
      game: formatGameInfo(game, false),
    });
  });

  // master clear quiz / reset game
  socket.on('reset', ({ gameCode, mid, resetWinCounts }) => {
    const game = onGoingGames[gameCode];

    // only master could clear / reset game
    if (!game || !mid || mid !== game.master.mid) {
      // show error
      return;
    }

    if (resetWinCounts) {
      resetGame(game);
    } else {
      clearQuiz(game);
    }

    io.to(gameCode).emit('updatedGame', {
      game: formatGameInfo(game),
    });
  });

  socket.on('disconnect', () => {
    console.log(`${socket.id} has disconnected`);
    let gameCode = getGameCodeByMasterId(onGoingGames, socket.id);

    if (gameCode) {
      socket.leave(gameCode);
      io.to(gameCode).emit('gameIsOver', {
        code: 444,
        message: 'Master left, the game is over',
      });

      // remove from memory
      delete onGoingGames[gameCode];
      console.log(onGoingGames);
      return;
    }

    gameCode = getGameCodeByPlayerId(onGoingGames, socket.id);
    if (gameCode) {
      removePlayer(onGoingGames[gameCode], socket.id);
      socket.leave(gameCode);
      io.to(gameCode).emit('updatedGame', {
        game: formatGameInfo(onGoingGames[gameCode]),
      });
    }
  });
});

const PORT = process.env.API_INTERNAL_HTTP_PORT;

http.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}`);
});
