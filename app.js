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

const {
  isValidString,
  isValidUUID,
  isValidArrayOfStrings,
  isExplicitBool,
  isInteger,
} = require('./utils/validatioin');

const quizs = require('./quizs');
const { getRandomNumber } = require('./utils/number');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: process.env.FRONTEND_URL,
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const onGoingGames = {};

// make a new game room
app.post('/new', async (req, res) => {
  try {
    const { name } = req.body;
    if (!isValidString(name))
      throw new Error('The master must provide a valid display name.');

    // register and initialize a new game with master info
    // generate master identifier
    const gameCode = uuidv4();
    const mid = uuidv4();
    onGoingGames[gameCode] = getNewGame(mid, name);

    res.status(200).json({ gameCode, mid });
  } catch (err) {
    res.status(400).json({ error: err });
  }
});

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);

  // when master / players join a game
  socket.on('join', ({ gameCode, mid, name }) => {
    if (
      !isValidUUID(gameCode) ||
      !(!mid || (mid && isValidUUID(mid))) ||
      !(!name || (name && isValidString(name)))
    ) {
      io.to(socket.id).emit('error', {
        msg: 'Please provide valid info to join the game.',
      });
      return;
    }

    const game = onGoingGames[gameCode];
    if (!game) {
      io.to(socket.id).emit('error', {
        msg: 'Game not found or already finished.',
      });
      return;
    }

    // identify master or player
    if (mid && mid === game.master?.mid) {
      game.master.id = socket.id;
    } else {
      // add as a player and initial set up the initial state
      addNewPlayer(onGoingGames[gameCode], socket.id, name);
    }

    socket.join(gameCode);

    io.to(gameCode).emit('updatedGame', {
      game: formatGameInfo(game),
    });
  });

  // master generate a new quiz
  socket.on('start quiz', ({ gameCode, mid, quiz, timeLimit = 20 }) => {
    if (
      !isValidUUID(gameCode) ||
      !isValidUUID(mid) ||
      !(
        quiz &&
        isValidString(quiz.question) &&
        isValidArrayOfStrings(quiz.options, 2) &&
        isInteger(quiz.bingo)
      ) ||
      !isInteger(timeLimit)
    ) {
      io.to(socket.id).emit('error', {
        msg: 'Please provide valid info to make new quiz.',
      });
      return;
    }

    let game = onGoingGames[gameCode];
    if (!game) {
      io.to(socket.id).emit('error', {
        msg: 'Game not found or already finished.',
      });
      return;
    }

    if (mid !== game.master.mid) {
      io.to(socket.id).emit('error', {
        msg: 'Only master could raise a quiz.',
      });
      return;
    }

    if (game.isOngoing) {
      io.to(socket.id).emit('error', {
        msg: "Can't raise a new game while a quiz is still ongoing.",
      });
      return;
    }

    if (game.showBingo) game.showBingo = false;

    game.quiz = quiz;
    game.isOngoing = true;

    io.to(gameCode).emit('updatedGame', {
      game: formatGameInfo(game),
    });

    let timeleft = timeLimit;
    let downloadTimer = setInterval(function () {
      io.to(gameCode).emit('counter', {
        timeleft,
      });

      timeleft -= 1;
      if (timeleft <= -1) {
        clearInterval(downloadTimer);
      }

      if (timeleft === -1) {
        game.isOngoing = false;
        game.showBingo = true;
        calWinCounts(game);

        io.to(gameCode).emit('updatedGame', {
          game: formatGameInfo(game, false),
        });
      }
    }, 1000);
  });

  socket.on('get random quiz', ({}, callback) => {
    callback({
      quiz: quizs[getRandomNumber(quizs.length)],
    });
  });

  // a player selects an answer
  socket.on('select', ({ gameCode, answer }) => {
    if (!isValidUUID(gameCode) || !isInteger(answer)) {
      io.to(socket.id).emit('error', {
        msg: 'Please provide valid info for answer.',
      });
      return;
    }

    const game = onGoingGames[gameCode];
    if (!game) {
      io.to(socket.id).emit('error', {
        msg: 'Game not found or already finished.',
      });
      return;
    }

    // player can't select while the current quiz bingo is under revealed
    if (game.showBingo) {
      io.to(socket.id).emit('error', {
        msg: "Can't select after the bingo is revealed.",
      });
      return;
    }

    const player = game.players.find((player) => player.id === socket.id);
    player.answer = answer;
  });

  // master clear quiz / reset game
  socket.on('reset', ({ gameCode, mid, resetWinCounts = false }) => {
    if (
      !isValidUUID(gameCode) ||
      !isValidUUID(mid) ||
      !isExplicitBool(resetWinCounts)
    ) {
      io.to(socket.id).emit('error', {
        msg: 'Please provide valid info to reset a game.',
      });
      return;
    }

    const game = onGoingGames[gameCode];
    if (!game) {
      io.to(socket.id).emit('error', {
        msg: 'Game not found or already finished.',
      });
      return;
    }

    if (mid !== game.master.mid) {
      io.to(socket.id).emit('error', {
        msg: 'Only master could reset a quiz or game.',
      });
      return;
    }

    if (game.isOngoing) {
      io.to(socket.id).emit('error', {
        msg: "Can't reset a quiz or game while a quiz is still ongoing.",
      });
      return;
    }

    // check explict value
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
      io.to(gameCode).emit('master left', {
        code: 444,
        msg: 'Master left, the game is over.',
      });

      // remove from memory
      delete onGoingGames[gameCode];
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
