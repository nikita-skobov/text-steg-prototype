const fs = require('fs')
const {
  verifyAndFillOptions,
  xmur3,
  JSF,
  fillCharMap,
  bitToCharMap: bMap,
  shuffleBitMap,
  has,
} = require('../utils')

function wordNotInMap(word, lettersInMap) {
  let result = true

  for (let i = 0; i < word.length; i += 1) {
    const char = word[i]
    if (lettersInMap.indexOf(char) !== -1) {
      result = false
      break
    }
  }

  return result
}


function decode(cliObj) {
  const opts = verifyAndFillOptions(cliObj, decodeCommand.args)
  const {
    file,
    seed,
    output,
  } = opts

  const fileData = fs.readFileSync(file, { encoding: 'UTF-8' })
  const seedNum = xmur3(seed)
  const getRandomNumber = JSF(seedNum())
  const charToBitMap = {}
  const bitToCharMap = { ...bMap }
  fillCharMap(bitToCharMap, charToBitMap)
  const wordArray = fileData.split(' ')
  const outputData = []


  for (let i = 0; i < wordArray.length; i += 2) {
    // 2 because we evaluate 2 words at once
    let higherWord = wordArray[i]
    let lowerWord = wordArray[i + 1]

    // =====================================================
    // this block determines if a word should be skipped or not.
    // if the charBitMap = { s: 0, a: 1, b: 2, e: 4, k: 8 }
    // and we encounter a word 'ban' we know that ban has characters
    // that are in the charBitMap, so we should use this word to
    // decode, but if we encounter a word: 'to'
    // 'to' does not have any characters in our current mapping,
    // so we can skip this word, and not interpret it.
    const bitKeys = Object.keys(charToBitMap)
    let higherNotInMap = wordNotInMap(higherWord, bitKeys)
    let lowerNotInMap = wordNotInMap(lowerWord, bitKeys)
    let wordsNotInMap = higherNotInMap || lowerNotInMap

    let shouldContinue = false
    let index = 1
    while (wordsNotInMap) {
      if (higherNotInMap && lowerNotInMap) {
        shouldContinue = true
        break
      } else if (higherNotInMap) {
        higherWord = lowerWord
        lowerWord = wordArray[i + 1 + index]
      } else {
        // lowerNotInMap
        lowerWord = wordArray[i + 1 + index]
      }

      index += 1
      higherNotInMap = wordNotInMap(higherWord, bitKeys)
      lowerNotInMap = wordNotInMap(lowerWord, bitKeys)
      wordsNotInMap = higherNotInMap || lowerNotInMap
    }
    i += index - 1
    if (shouldContinue) continue
    // =====================================================

    let higherNibble = 0
    let lowerNibble = 0

    for (let j = 0; j < higherWord.length; j += 1) {
      const char = higherWord.charAt(j)
      if (has.call(charToBitMap, char)) {
        higherNibble += parseInt(charToBitMap[char], 10)
      }
    }

    shuffleBitMap(getRandomNumber, bitToCharMap)
    fillCharMap(bitToCharMap, charToBitMap)

    for (let j = 0; j < lowerWord.length; j += 1) {
      const char = lowerWord.charAt(j)
      if (has.call(charToBitMap, char)) {
        lowerNibble += parseInt(charToBitMap[char], 10)
      }
    }
    shuffleBitMap(getRandomNumber, bitToCharMap)
    fillCharMap(bitToCharMap, charToBitMap)

    const byte = (higherNibble << 4) | lowerNibble
    outputData.push(byte)
  }

  const bufferData = Buffer.from(outputData)
  fs.writeFileSync(output, bufferData)
}

const decodeCommand = {
  info: `given an encoded file, decode it and output the decoded data to a new file.`,
  args: {
    seed: {
      default: 'abc',
      required: false,
      info: `If encoded with a seed, the same seed
              must be provided when decoding.`
    },
    file: {
      required: true,
      info: `The name of the file which contains encoded text`
    },
    output: {
      default: 'decoded.txt',
      required: false,
      info: `The name of the file that will output the
              decoded text.`
    },
  },
}

module.exports = {
  decodeCommand,
  decode,
}
