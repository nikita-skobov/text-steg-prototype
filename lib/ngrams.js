const fs = require('fs')
const { has } = require('./utils')
const readline = require('readline')
const defaultN = 2

function fillNGram(outerMap, n, wordList) {
  const numWords = wordList.length
  const iMax = numWords - (n - 1)
  for (let i = 0; i < iMax; i += 1) {
    let cMap = outerMap

    for (let j = i; j < i + n; j += 1) {
      const word = wordList[j]
      if (!word) break // reached end of the word list

      if (has.call(cMap, word)) {
        cMap[word].val += 1
        cMap = cMap[word].next
      } else {
        cMap[word] = { val: 1, next: {} }
        cMap = cMap[word].next
      }
    }
  }
}

function getCountOf(word, map, given) {
  if ((given && given.length === 0) || !given) {
    const { val } = map[word] || { val: 0 }
    return val
  } else if (given && given.length > 0) {
    const [givenWord] = given
    const nextGiven = given.slice(1, given.length)
    if (map[givenWord]) {
      const nextMap = map[givenWord].next
      return getCountOf(word, nextMap, nextGiven)
    } else {
      return 0
    }
  }
}


function sumWords(map) {
  let sum = 0
  Object.keys(map).forEach((key) => {
    sum += map[key].val
  })
  return sum
}

function getProbabilityOf(word, map, given, smoothing = 'none', wordSum) {
  if (smoothing === 'none') {
    const numerator = getCountOf(word, map, given)
    const lastGiven = given[given.length - 1]
    const beforeLastGiven = given.slice(0, given.length - 1)
    

    let denomenator = (given && given.length > 0) ?
      getCountOf(lastGiven, map, beforeLastGiven) :
      wordSum

    if (!denomenator && denomenator !== 0) {
      denomenator = sumWords(map)
    }

    if (denomenator === 0) return 0
    return (numerator / denomenator)
  } else if (smoothing === 'add-1' || smoothing === 'laplace' || typeof smoothing === 'number') {
    let number = typeof smoothing === 'number' ? smoothing : 1
    const numerator = getCountOf(word, map, given) + number
    const numWords = Object.keys(map).length
    let denomenator = (given && given.length > 0) ?
      getCountOf(given[0], map, given.slice(1, given.length)) + (numWords * number) :
      wordSum

    if (!denomenator && denomenator !== 0) {
      denomenator = sumWords(map)
    }

    if (denomenator === 0) return 0
    return (numerator / denomenator)
  }
}

function interpolateProbability(word, map, given, wordSum, smoothing = 'none') {
  const maxIterations = given.length + 1
  const lambda = 1 / maxIterations
  let probability = 0
  for (let i = 0; i < maxIterations; i += 1) {
    const innerProbability = getProbabilityOf(word, map, given, smoothing, wordSum)
    probability += lambda * innerProbability
    given = given.slice(1, given.length)
  }
  return probability
}


function weightedChoice(choices) {
  let total = 0
  const maxIterations = 100
  const bumpFactor = 1
  for (let i = 0; i < maxIterations; i += 1) {
    const value = choices[i][1] // choices of i = [ ['words'], value ]
    total += (value * bumpFactor)
  }

  const rand = Math.random() * total
  let upto = 0
  for (let i = 0; i < maxIterations; i += 1) {
    const [words, value] = choices[i]
    if (upto + (value * bumpFactor) > rand) {
      return words
    }
    upto += (value * bumpFactor)
  }

  // return an array of words [ 'he', 'did', 'not' ]
  // ie: given [
  //  ['he', 'did', 'not']
  //  ['he', 'opened', 'the']
  // ]
  // weightedChoice picks one of these arrays randomly,
  // and getNGramSentence takes the 1st element, which
  // is the word after he.
}



function wordPickerHelper(lastWords, gramMap) {
  let currentObject = gramMap

  let currentNDepth = lastWords.length
  let currentI = 0
  for (let i = 0; i < lastWords.length; i += 1) {
    const word = lastWords[i]
    if (currentObject[word]) {
      // if that word exists in the current map layer
      currentObject = currentObject[word].next
    } else {
      // otherwise try next n-depth
      currentNDepth -= 1
      currentObject = gramMap
      currentI += 1
      i = currentI - 1
      // - 1 because i will be incremented at the end of this loop
    }
  }
  const allWords = Object.keys(currentObject)
  const sortedWords = allWords.sort((a, b) => currentObject[b].val - currentObject[a].val)
  const sortedWordsAndValues = sortedWords.map((word) => [word, currentObject[word].val])
  return {
    sortedWords,
    sortedWordsAndValues,
    currentNDepth,
  }
}

function pickNextWord(lastWords, gramMap) {
  const { sortedWordsAndValues, currentNDepth } = wordPickerHelper(lastWords, gramMap)
  return weightedChoice(sortedWordsAndValues)
}

function getSortedList(lastWords, gramMap) {
  const { sortedWords, currentNDepth } = wordPickerHelper(lastWords, gramMap)
  return { sortedWords, nDepth: currentNDepth }
}

function createNGram({
  filename,
  replacements = [['---end.of.document---', ''], [/["“']/g, ''], ['project gutenberg', ''], ['gutenberg-tm', '']],
  splitRegex = /[^A-Za-z.]+/,
  n = defaultN,
  lineLimit = undefined,
}) {
  const textFileName = filename && typeof filename === 'string' ? filename : '19bookscombined.txt'

  console.log(`Loading corpus: ${textFileName}`)

  return new Promise((res, rej) => {
    try {
      const instream = fs.createReadStream(textFileName, { encoding: 'UTF-8' })
      const rl = readline.createInterface({
        input: instream,
      })
    
      let sentence = []
      let lineCount = 0
      let gram = {}
      let done = false
      rl.on('line', (line) => {
        if (done) return undefined
    
        let text = line.toLowerCase()
        replacements.forEach(([search, replaceWith]) => {
          text = text.replace(search, replaceWith)
        })
        let words = text.split(splitRegex)
        words = words.filter(Boolean)
    
        words.forEach((word) => {
          const periodIndex = word.indexOf('.')
          let hasMultiplePeriods = false
          if (periodIndex !== -1) {
            hasMultiplePeriods = word.indexOf('.', periodIndex + 1) !== -1
          }
    
          const isTitle = word === 'dr.' ||
            word === 'mr.' ||
            word === 'ms.' ||
            word === 'mrs.'
    
            if (periodIndex !== - 1 && word.charAt(0) !== '.' && !isTitle && !hasMultiplePeriods) {
              const withoutPeriod = word.slice(0, periodIndex)
              sentence.push(withoutPeriod, '.')
    
              if (sentence.length <= n) {
                sentence = ['.']
                // skip sentences with one word.
              } else {
                // take n-grams of current sentence.
                fillNGram(gram, n, sentence)
        
                const lastNElements = sentence.slice(sentence.length - n + 1, sentence.length)
                // console.log(lastNElements)
                // remove everything from sentence except .
                sentence = lastNElements
                const indexOfEmptyStr = sentence.indexOf('')
              }
          } else {
            if (word !== '.' && word !== 's' && word !== 'n') {
              // prevent single periods from getting through:
              // ie: when source text has . . .
    
              while(word.indexOf('..') !== -1) {
                word = word.replace('..', '.')
              }
              // prevent multiple periods from getting through:
              // ie: when source text has ...
              
              if (word === 't') {
                let previousWord = sentence[sentence.length - 1]
                sentence[sentence.length - 1] = `${previousWord}${word}`
              } else {
                sentence.push(word)
              }
            }
          }
        })

        if (lineLimit && lineCount > lineLimit) {
          console.log(`STOPPED READING FILE AT LINE ${lineCount}\n`)
          done = true
          rl.close()
          return res({ gram })
        }

        lineCount += 1
      })

      rl.on('close', () => {
        if (!done) {
          console.log('REACHED END OF FILE\n')
          done = true
          return res({ gram })
        }
      })

    } catch (e) {
      return rej(e)
    }
  })
}


module.exports = {
  createNGram,
  pickNextWord,
  getSortedList,
  defaultN,
}
