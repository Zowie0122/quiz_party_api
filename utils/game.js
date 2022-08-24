const { deepClone } = require('./object');

const GAME_INITIAL = {
  master: {
    mid: null,
    id: null,
    name: null,
  },

  quiz: {
    question: null,
    options: ['', ''],
    bingo: null,
  },

  players: [],

  isOngoing: false,
  showBingo: false,
};

const PLAYER_INITIAL = {
  id: null,
  name: null,
  answer: null,
  winCounts: 0,
};

/**
 * set up a new game instance
 * @param {uuid} mid
 * @param {string} masterName
 * @returns {object} game object
 */
const getNewGame = (mid, masterName) => {
  const _game = deepClone(GAME_INITIAL);
  _game.master = {
    ..._game.master,
    mid,
    name: masterName,
  };

  return _game;
};

/**
 * format quiz with musking the bingo and each player's answer
 * @param {object} game
 * @returns {object} game object
 */
const formatGameInfo = (game) => {
  const _game = deepClone(game);
  if (!_game.showBingo) {
    delete _game.quiz.bingo;
    _game.players.forEach((player) => delete player.answer);
  }

  return _game;
};

/**
 * add win counts to a player if she/he selected the right answer
 * @param {Object} game
 */
const calWinCounts = (game) => {
  game.players.forEach((player) => {
    if (player.answer === game.quiz.bingo) {
      player.winCounts += 1;
    }
  });
};

/**
 * master clear a quiz
 * @param {Object} game
 */
const clearQuiz = (game) => {
  game.quiz = GAME_INITIAL.quiz;
  game.players.forEach((player) => {
    player.answer = PLAYER_INITIAL.answer;
  });
};

/**
 * reset the players' winCounts
 * @param {object} game
 */
const resetGame = (game) => {
  clearQuiz(game);
  game.players.forEach((player) => {
    player.winCounts = PLAYER_INITIAL.winCounts;
  });
};

/**
 * get game code by master's id
 * @param {array} games
 * @param {string} id
 * @returns {uuid | null}
 */
const getGameCodeByMasterId = (games, id) => {
  for (const gameCode in games) {
    if (games[gameCode].master.id === id) {
      return gameCode;
    }
  }
};

/**
 * get game code by player's id
 * @param {array} games
 * @param {string} id
 * @returns {uuid | null}
 */
const getGameCodeByPlayerId = (games, id) => {
  for (const gameCode in games) {
    if (games[gameCode].players.some((player) => player.id === id)) {
      return gameCode;
    }
  }
};

/**
 * add a new player to a game
 * @param {object} game
 * @param {string} playerId
 * @param {string} playerName
 */
const addNewPlayer = (game, playerId, playerName) => {
  game.players.push({
    ...PLAYER_INITIAL,
    id: playerId,
    name: playerName,
  });
};

/**
 * remove a player from a game
 * @param {object} game
 * @param {string} playerId
 */
const removePlayer = (game, playerId) => {
  game.players = game.players.filter((player) => player.id !== playerId);
};

module.exports = {
  getNewGame,
  addNewPlayer,
  formatGameInfo,
  calWinCounts,
  clearQuiz,
  resetGame,
  getGameCodeByMasterId,
  getGameCodeByPlayerId,
  removePlayer,
};
