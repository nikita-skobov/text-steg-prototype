const has = Object.prototype.hasOwnProperty

function parseCommandLineArguments(argList) {
  const args = argList.slice(2)

  const cliObj = {
    _: [], // fills an array of command line arguments that arent
    // options, eg: program.sh runsomething then do something --some-arg yes
    // will fill the array with: ['runsomething', 'then', 'do', 'something']
    // and the 'some-arg' will become a seperate property of the cliObj
  }

  // used to skip iteration of indices which have already been grabbed
  const skipIndices = []

  // used to semantically check the next command line string
  const checkNext = ind => ({
    // this is a function that immediately returns an object with
    // 3 properties. exists is a bool,
    // doesntStartWith is a function,
    // str is the string of the argument at index 'ind'.
    exists: typeof args[ind] !== 'undefined',
    doesntStartWith: str => !args[ind].startsWith(str),
    str: args[ind],
  })

  const checkForDuplicates = (str) => {
    if (has.call(cliObj, str)) {
      throw new Error(`Duplicate command line argument found: ${str}`)
    }
  }

  const fillCliObject = (numDashes, str, index) => {
    const nextIndex = checkNext(index + 1)
    const property = str.substring(numDashes)
    if (nextIndex.exists && nextIndex.doesntStartWith('-')) {
      checkForDuplicates(property)

      // option with a value, ie: --name jimmy
      const value = nextIndex.str
      cliObj[property] = value
      // mark this index, and the next index as already been read
      skipIndices.push(index, index + 1)
    } else {
      checkForDuplicates(property)

      // boolean option, ie: --ignore-warnings-flag
      cliObj[property] = true
      // mark this index as already been read
      skipIndices.push(index)
    }
  }


  args.forEach((str, index) => {
    if (skipIndices.indexOf(index) >= 0) {
      // we already grabbed that index, so skip
      return null
    }

    if (str.startsWith('--')) {
      fillCliObject(2, str, index)
    } else if (str.startsWith('-')) {
      fillCliObject(1, str, index)
    } else {
      // adds an argument to an array of arguments that dont
      // correspond to any options like --name, or -c
      cliObj._.push(str)
      skipIndices.push(index)
    }

    return null
  })

  return cliObj
}

function xmur3(str) {
  for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
      h = h << 13 | h >>> 19;
  return function() {
      h = Math.imul(h ^ h >>> 16, 2246822507);
      h = Math.imul(h ^ h >>> 13, 3266489909);
      return (h ^= h >>> 16) >>> 0;
  }
}

function JSF(seed) {
  function jsf() {
      var e = s[0] - (s[1]<<27 | s[1]>>>5);
       s[0] = s[1] ^ (s[2]<<17 | s[2]>>>15),
       s[1] = s[2] + s[3],
       s[2] = s[3] + e, s[3] = s[0] + e;
      return (s[3] >>> 0) / 4294967296; // 2^32
  }
  seed >>>= 0;
  var s = [0xf1ea5eed, seed, seed, seed];
  for(var i=0;i<20;i++) jsf();
  return jsf;
}

function verifyAndFillOptions(cliObj, args) {
  const opts = {}

  const argWords = Object.keys(args)
  for (let i = 0; i < argWords.length; i += 1) {
    const argKey = argWords[i]
    const argObj = args[argKey]

    const optsKey = argKey.indexOf('-') !== -1 ?
      argKey.replace('-', '') :
      argKey
    // if an option has a dash, ie: --word-seed
    // remove the dash so that the variable can be used
    // without quotes

    if (cliObj[argKey]) {
      // user supplied that option so use their value
      opts[optsKey] = cliObj[argKey]

      const defaultValue = argObj.default
      if (defaultValue && typeof defaultValue === 'number') {
        // if the default for this option is a number, we must
        // parse it as such
        opts[optsKey] = parseInt(opts[argKey], 10)
        if (isNaN(opts[argKey])) {
          console.log(`COMMAND FAILED:\n--${argKey} must be a number, but ${cliObj[argKey]} could not be parsed into a number`)
          return null
        }
      }
    } else if (argObj.required) {
      // user did not supply this option, and it was required
      console.log(`COMMAND FAILED:\nMissing required option --${argKey}`)
      return null
    } else {
      // not supplied, and not required, use the default.
      opts[optsKey] = argObj.default
    }
  }

  return opts
}

function fillCharMap(mapSource, mapDest) {
  Object.keys(mapSource).forEach((bit) => {
    const char = mapSource[bit]
    mapDest[char] = bit
  })
}

function shuffleBitMap(getRandomNumber, map) {
  const oldCopy = { ...map }
  const bitList = ['0', '1', '2', '4', '8']
  while (bitList.length > 1) { // because bitList is odd, every iteration removes 2 elements
    const index = Math.floor(getRandomNumber() * bitList.length)    
    const bit = bitList[index]
    const oldBitChar = oldCopy[bit]
    bitList.splice(index, 1)

    const swapIndex = Math.floor(getRandomNumber() * bitList.length)    
    const swapBit = bitList[swapIndex]
    const swapBitChar = oldCopy[swapBit]
    bitList.splice(swapIndex, 1)

    map[bit] = swapBitChar
    map[swapBit] = oldBitChar
  }
}

const bitToCharMap = {
  0: 'e',
  1: 's',
  2: 'i',
  4: 'a',
  8: 'n',
}
const charToBitMap = {}


module.exports = {
  bitToCharMap,
  charToBitMap,
  fillCharMap,
  shuffleBitMap,
  has,
  parseCommandLineArguments,
  verifyAndFillOptions,
  JSF,
  xmur3,
}

