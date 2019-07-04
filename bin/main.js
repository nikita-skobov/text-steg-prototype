#!/usr/bin/env node

const fs = require('fs')
// const { createNGram, getSortedList, defaultN } = require('../lib/ngrams')
// const { wordify } = require('../lib/wordify')
const commandModule = require('../lib/commandModule')
const { parseCommandLineArguments, has } = require('../lib/utils')

function main() {
  const cliObj = parseCommandLineArguments(process.argv)

  const [command] = cliObj._

  switch (command) {
    case 'decode': 
      return commandModule.decode(cliObj)
    case 'encode':
      return commandModule.encode(cliObj)
    case 'only-encode': {
      console.log('not wordifying')
    }
    case 'help':
      return commandModule.help(command)
    default:
      return commandModule.help(command)
  }

}
main()
