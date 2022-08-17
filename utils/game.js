const { deepClone } = require("./object")

const GAME_INITIAL = {
  master: {
    mid: null,
    id: null,
    name: null,
  },

  quiz: {
    question: null,
    options: {
      A: null,
      B: null,
      C: null,
      D: null
    },
    bingo: null
  },

  players: [],

  showBingo: false
}

const PLAYER_INITIAL = {
  id: null,
  name: null,
  answer: null,
  winCounts: 0
}

const getNewGame = (mid, masterName) => {
  const _game = deepClone(GAME_INITIAL)
  _game.master = {
    ..._game.master,
    mid,
    name: masterName
  }

  return _game
}

const formatGameInfo = (game) => {
  const _game = deepClone(game)
  if (!_game.showBingo) {
    delete _game.quiz.bingo
    _game.players.forEach(player => delete player.answer)
  }

  return _game
}

const calWinCounts = (game) => {
  game.players.forEach(player => {
    if (player.answer = game.quiz.bingo) {
      player.winCounts++
    }
  })
}

const clearQuiz = (game) => {
  game.quiz = GAME_INITIAL.quiz
  game.players.forEach(player => {
    player.answer = PLAYER_INITIAL.answer
  })
}

// reset the players' winCounts
const resetGame = (game) => {
  clearQuiz(game)
  game.players.forEach(player => {
    player.winCounts = PLAYER_INITIAL.winCounts
  })
}

const getGameCodeByMasterId = (games, id) => {
  for (const gameCode in games) {
    console.log("gameMasterId", games[gameCode].master.id, "masterId", id)
    if (games[gameCode].master.id === id) {
      return gameCode
    }
  }
}

const getGameCodeByPlayerId = (games, id) => {
  for (const gameCode in games) {
    if (games[gameCode].players.some(player => player.id === id)) {
      return gameCode
    }
  }
}

const addNewPlayer = (game, playerId, playerName) => {
  game.players.push({
    ...PLAYER_INITIAL,
    id: playerId,
    name: playerName,
  })
}

const removePlayer = (game, playerId) => {
  game.players = game.players.filter(player => player.id !== playerId)
}

module.exports = {
  getNewGame, addNewPlayer, formatGameInfo, calWinCounts, clearQuiz, resetGame, getGameCodeByMasterId, getGameCodeByPlayerId, removePlayer
}
