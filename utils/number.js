/**
 * get a random number within a limit
 * @param {number} max
 * @returns {number}
 */
const getRandomNumber = (max) => {
  return Math.floor(Math.random() * max);
};

module.exports = { getRandomNumber };
