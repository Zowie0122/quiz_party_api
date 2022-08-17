const deepClone = (data) => {
  // if it is a primitive data or null, no need to do copy
  if (typeof data !== 'object' || data === null) return data

  const newObj = Array.isArray(data) ? [] : {}
  for (let key in data) {
    newObj[key] = deepClone(data[key])
  }

  return newObj
}

module.exports = {
  deepClone
}
