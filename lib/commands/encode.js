const fs = require('fs')
const {
  verifyAndFillOptions,
  xmur3,
  JSF,
  bitToCharMap: bMap,
  shuffleBitMap,
  fillCharMap,
} = require('../utils')
const { wordify } = require('../wordify')

function pickWord(byteNum, charMap) {
  const byte = byteNum.toString()

  if (charMap[byte]) {
    // if the byte is 0, 1, 2, or 4,
    // the 'word' can be a single character.
    return charMap[byte]
  }

  // otherwise, add characters for each bit that is set in the byte
  let word = ''
  let mask = 1 << 3 // start at 4, going down
  let wordValue = 0
  while (wordValue !== byteNum) {
    if ((byteNum & mask) != 0) {
      // byte contains a bit at the current mask
      const maskString = mask.toString()
      word = `${word}${charMap[maskString]}`
      wordValue += mask
    }
    mask = mask >>> 1
  }

  return word
}

function encode(cliObj) {
  const opts = verifyAndFillOptions(cliObj, encodeCommand.args)
  console.log(opts)
  const bitToCharMap = { ...bMap }

  const {
    seed,
    file,
    wordseed,
  } = opts

  const fileData = fs.readFileSync(file)
  const seedNum = xmur3(seed)
  let getRandomNumber = JSF(seedNum())
  let textData = ''

  fileData.forEach((byte) => {
    const higherNibble = (byte & 0xF0) >> 4
    const lowerNibble = byte & 0x0F

    const higherWord = pickWord(higherNibble, bitToCharMap)
    shuffleBitMap(getRandomNumber, bitToCharMap)
    textData = `${textData}${higherWord} `

    const lowerWord = pickWord(lowerNibble, bitToCharMap)
    shuffleBitMap(getRandomNumber, bitToCharMap)
    textData = `${textData}${lowerWord} `
  })

  textData = textData.slice(0, -1) // remove trailing space
  const fileWords = textData.split(' ')

  if (wordseed) {
    // option to provide a seperate seed for generating the initial
    // word sequence
    const wordHash = xmur3(wordseed)
    getRandomNumber = JSF(wordHash()) 
  }

  const fillFunc = (dest) => {
    fillCharMap(bitToCharMap, dest)
  }

  wordify(opts, fileWords, fillFunc, {}, getRandomNumber)
}


const encodeCommand = {
  info: `given any file, encode it and output the encoded data to a new file.`,
  args: {
    seed: {
      default: 'abc',
      required: false,
      info: `a seed that, if provided, must be also provided
                when decoding in order to retrieve
                the original data.`
    },
    file: {
      required: true,
      info: `name of the file that will be encoded.`
    },
    output: {
      default: 'encoded.txt',
      required: false,
      info: `name of the file that will output
              the encoded text.`
    },
    'word-seed': {
      required: false,
      info: `used to seed the word generation.
                this seed does not affect encoding or decoding.`
    },
    words: {
      default: 'varney.txt',
      required: false,
      info: `name of the corpus to use when generating
                the n-gram structure for word prediction.`
    },
    n: {
      default: 2,
      required: false,
      info: `size of the n-gram structure.`
    },
  },
}

module.exports = {
  encodeCommand,
  encode,
}
