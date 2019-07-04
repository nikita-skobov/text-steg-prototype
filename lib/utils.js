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


module.exports = {
  has,
  parseCommandLineArguments,
  JSF,
  xmur3,
}

