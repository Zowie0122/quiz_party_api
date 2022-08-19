// check if a value is an non empty string
const isValidString = (input) => {
  if (typeof input !== 'string' || !input.trim()) return false;
  return true;
};

// check if a value meets uuid4 format
const isValidUUID = (input) => {
  const UUID_4_REG =
    /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
  return typeof input !== 'string' || UUID_4_REG.test(input);
};

// check if a value is an array that contains more than minLength elements, and the elements doesn't inclue empty string
const isValidArrayOfStrings = (input, minLength) => {
  return (
    Array.isArray(input) &&
    input.length >= minLength &&
    input.every((el) => isValidString(el))
  );
};

// check if a value is either true or false explicitly
const isExplicitBool = (input) => {
  return typeof input === 'boolean';
};

// check if a value is integer within a range
const isInteger = (input) => {
  return Number.isInteger(input);
};

module.exports = {
  isValidString,
  isValidUUID,
  isValidArrayOfStrings,
  isExplicitBool,
  isInteger,
};
