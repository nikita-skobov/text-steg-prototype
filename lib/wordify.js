const fs = require('fs')
const { has } = require('./utils')
const { defaultN, createNGram, getSortedList, pickNextWord } = require('./ngrams')


function pickRealWord(gibWord, restrictedChars, realWords, shifted = 0, typoCount = 1, allowedSkipWords) {
  let outputWord = gibWord
  const realWordsLength = realWords.length
  const maxIndex = realWordsLength + shifted
  const typoList = []
  let consoleBuffer = ''
  let canUseSkipWord = false
  let potentialSkipWord = ''

  for (let i = shifted; i < maxIndex; i += 1) {
    const word = realWords[i] || realWords[(i - shifted)]
    const gibWordScore = new Array(gibWord.length).fill(0)

    const wordIsValidSkipWord = allowedSkipWords.indexOf(word) !== -1
    if (wordIsValidSkipWord) {
      canUseSkipWord = true
      potentialSkipWord = word
    }

    for (let j = 0; j < word.length; j += 1) {
      const char = word[j]

      if (restrictedChars.indexOf(char) !== -1) {
        // this word contains a restricted character, skip it.

        gibWordScore[0] = 0 // ensure that after breaking from
        // the inner loop that perfectScore is not miscalculated to be true
        break
      }

      const gibWordIndex = gibWord.indexOf(char)
      if (gibWordIndex !== -1) {
        gibWordScore[gibWordIndex] += 1
      }
    }

    const perfectScore = () => {
      let allIndicesGreaterThan0 = true
      let numberOver = 0
      let allIndicesEqual1 = true
      let typoChars = []
      for (let i = 0; i < gibWordScore.length; i += 1) {
        if (gibWordScore[i] === 0) allIndicesGreaterThan0 = false
        if (gibWordScore[i] !== 1) allIndicesEqual1 = false
        if (gibWordScore[i] > 1) {
          const overBy = gibWordScore[i] - 1
          numberOver += overBy
          const typoChar = gibWord.charAt(i)
          for (let k = 0; k < overBy; k += 1) {
            typoChars.push(typoChar)
          }
        }
      }

      
      if (allIndicesGreaterThan0 && (numberOver <= typoCount) && !allIndicesEqual1) {
        // if we allow typos, we pass a typoCount number.
        // if typoCount === 1, we allow words that have 1 character missing
        let typoWord = word
        typoChars.forEach((char) => {
          typoWord = typoWord.replace(char, '')
        })
        
        const typoListElement = typoList[numberOver]
        if (typoListElement) {
          // if it is already an array
          typoListElement.push([typoWord, word])
        } else {
          typoList[numberOver] = [[typoWord, word]]
        }
      }

      return allIndicesEqual1
    }

    if (perfectScore()) {
      outputWord = word
      return { word, failed: false, usedTypo: false }
    }
  }

  let usedTypo = false
  let failed = true
  let beforeTypo = undefined
  if (typoList.length) {
    for (let i = 0; i < typoList.length; i += 1) {
      const wordList = typoList[i]
      if (wordList) {
        const word = wordList[0][0]
        const wordWithoutTypo = wordList[0][1]
        // typoList can have skipped indices
        // so check if wordList is not undefined
        usedTypo = true
        failed = false
        beforeTypo = wordWithoutTypo
        outputWord = word
        break
      }
    }
  }

  if (failed && canUseSkipWord) {
    // if still failed, see if we can use a skipped word?
    failed = false
    outputWord = potentialSkipWord
  }

  return { word: outputWord, failed, usedTypo, beforeTypo }
}

function getRestrictedChars(charMap, gibWord) {
  const restrictedChars = Object.keys(charMap)
  const chars = gibWord.split('')
  chars.forEach((char) => {
    const charIndex = restrictedChars.indexOf(char)
    restrictedChars.splice(charIndex, 1)
  })
  // when picking a real word to construct from the giberish
  // the real word cannot contain any characters found in the charToBitMap
  // that are not found in the word.
  // ie: word == hi
  // charToBitMap = { h: 0, i: 2, l: 4 }
  // restrictedChars would be l
  return restrictedChars
}

function getPredictedWords(currentWords, N, gram) {
  const nGramSlice = currentWords.slice(currentWords.length - N + 1, currentWords.length)
  // gets last N - 1 words
  return getSortedList(nGramSlice, gram)
}

function getInitialCurrentWords(map, N, randomFunc) {
  let currentMap = map
  const currentWords = []
  for (let i = 0; i < N - 1; i += 1) {
    const words = Object.keys(currentMap)
    const sortedWords = words.sort((a, b) => currentMap[b].val - currentMap[a].val)
    let maxIndex = 20
    if (sortedWords.length < maxIndex) maxIndex = sortedWords.length

    const randomWord = sortedWords[Math.floor(randomFunc() * maxIndex)]
    currentWords.push(randomWord)
    currentMap = currentMap[randomWord].next
  }

  return currentWords
}

function handleSuccess(i, metaData, currentWords, realWord, beforeTypo, usedTypo, currentNDepth) {
  let newI = i

  metaData.nextNDepth = metaData.maxN

  if (has.call(metaData.nDepthsUsed, currentNDepth)) {
    metaData.nDepthsUsed[currentNDepth] += 1
  } else {
    metaData.nDepthsUsed[currentNDepth] = 1
  }

  if (usedTypo) {
    metaData.succCount += 1
    metaData.typoCount += 1
    currentWords.push(beforeTypo)
  } else {
    // plain old success :)
    currentWords.push(realWord)
    
    const isSkipWord = metaData.allowedSkipWords.indexOf(realWord) !== -1
    if (isSkipWord) {
      metaData.nextNDepth = currentNDepth - 1
      // if we used a skip word that means we could not find a word
      // from the predicted word list that fits, so we will try this word again.
      // if we dont decrease the next N depth, we can potentially get stuck in an infinite loop

      newI = i - 1
      // go back and repeat this word to make sure it gets encoded.
      
      if (realWord === '.') {
        metaData.textData = metaData.textData.slice(0, -1)
        // if its a period, remove the last space before adding the period
      }
    } else {
      metaData.succCount += 1
    }
  }

  metaData.textData = `${metaData.textData}${realWord} `

  return newI
}

function doesNotContainCharacters(word, chars, skipMap) {
  if (has.call(skipMap, word)) return skipMap[word]

  let containsChars = false

  for (let i = 0; i < chars.length; i += 1) {
    if (word.indexOf(chars[i]) !== -1) {
      // if word contains that character
      containsChars = true
      break
    }
  }

  skipMap[word] = !containsChars

  return !containsChars
}



async function wordifyFunc(cliObj, fileWords, fillCharMap, charMap, randomFunc) {
  fillCharMap(charMap)

  const {
    n: N,
    words: wordfile,
    output,
    typos,
    maxlines
  } = cliObj

  const allowedTypos = typos
  const lineLimit = maxlines

  const { gram } = await createNGram({
    filename: wordfile,
    n: N,
    lineLimit,
  })
  
  const uniqueWords = Object.keys(gram)
  const currentWords = getInitialCurrentWords(gram, N, randomFunc)

  console.log(`unique words: ${uniqueWords.length}`)
  console.log('starting with seed words:')
  console.log(currentWords)
  console.log('\n')

  const metaData = {
    textData: '',
    failCount: 0,
    typoCount: 0,
    succCount: 0,
    allowedSkipWords: [],
    nDepthsUsed: {},
    maxN: N,
    nextNDepth: N,
  }
  const skipKeys = Object.keys(charMap)
  const skipMap = {}
  // TODO: if charMap changes keys, ie:
  // it doesnt always use the same characters
  // this would need to move inside the for loop and use:
  // const skipKeys = [...gibberishWord.split(''), ...restrictedChars]
  
  let counter = 0
  for (let i = 0; i < fileWords.length; i += 1) {
    const gibberishWord = fileWords[i]
    const restrictedChars = getRestrictedChars(charMap, gibberishWord)

    let wordHasBeenPicked = false
    let currentNDepth = metaData.nextNDepth

    while (!wordHasBeenPicked) {
      const {
        sortedWords,
        nDepth,
      } = getPredictedWords(currentWords, currentNDepth, gram)
      currentNDepth = nDepth
      metaData.allowedSkipWords = []
      sortedWords.forEach((word) => {
        if (doesNotContainCharacters(word, skipKeys, skipMap)) {
          metaData.allowedSkipWords.push(word)
        }
      })

      let shifted = 0
      if (cliObj['word-seed']) {
        let shiftMax = 10
        if (sortedWords.length < shiftMax) shiftMax = sortedWords.length
        shifted = Math.floor(randomFunc() * shiftMax)
      }

      // const shifted = Math.floor(randomFunc() * sortedWords.length)
      // console.log(`trying to find word for ${gibberishWord} using ${sortedWords.length} words, DEPTH: ${currentNDepth}`)

      const {
        word: realWord, // call it realWord to make more sense
        failed, // if it failed to find a realWord, realWord === gibberishWord
        usedTypo, // if it modified the realWord to fit the typo conditions
        beforeTypo // if usedTypo is true, what was the unmodified real word?
      } = pickRealWord(
        gibberishWord,
        restrictedChars,
        sortedWords,
        shifted,
        allowedTypos,
        metaData.allowedSkipWords
      )
  
      if (!failed) {
        i = handleSuccess(i, metaData, currentWords, realWord, beforeTypo, usedTypo, currentNDepth)
        // in case realWord was picked to be a skip word, we will append
        // that word to the final output, but we need to go back and actually
        // encode this gibberish word.
        wordHasBeenPicked = true
      } else if (currentNDepth === 0) {
        // we have tried all NDepths, and even using the entire
        // dictionary failed to find a word that fits our desired encoding,
        // simply return the gibberish word
        metaData.textData = `${metaData.textData}${realWord} `
        metaData.failCount += 1
      }
      // otherwise if we fail and currentNDepth > 0,
      // we will re iterate this while loop and use the next
      // n depth to get more sorted words to try to pick from
    }

    if (i === fileWords.length - 1) {
      console.log(`FILLED ${i + 1} / ${fileWords.length} WORDS\n`)
    } else if (i % 1000 === 0) {
      console.log(`FILLED ${i} / ${fileWords.length} WORDS`)
    }
  }

  let {
    textData,
    failCount,
    typoCount,
    succCount,
    nDepthsUsed,
  } = metaData

  console.log(`file had ${fileWords.length} words to wordify`)
  console.log(`Successfully found ${succCount} words`)
  console.log(`of the ${succCount} words, ${typoCount} were used with a typo`)
  console.log(`Failed to find a word ${failCount} times\n`)
  console.log('N-depth summary:')
  Object.keys(nDepthsUsed).forEach((n) => {
    console.log(`N DEPTH ${n} : ${nDepthsUsed[n]}`)
  })

  textData = textData.slice(0, -1)
  fs.writeFileSync(output, textData, { encoding: 'UTF-8' })
}

module.exports = {
  wordify: wordifyFunc,
}
