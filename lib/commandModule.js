const { encode, encodeCommand } = require('./commands/encode')
const { decode, decodeCommand } = require('./commands/decode')
const { has } = require('./utils')
const { programName } = require('./meta')


const commands = {
  help: {
    info: `Display all of the commands and options`,
    args: {},
  },
  decode: decodeCommand,
  encode: encodeCommand,
}

function help(command) {
  if (!has.call(commands, command)) {
    console.log(`Could not find command: ${command}`)
  }
  console.log(`USAGE: ${programName} [COMMAND] --[OPTIONS]\n`)
  console.log('Commands: ')
  Object.keys(commands).forEach((cmd) => {
    let outStr = `${cmd}: \n`
    if (commands[cmd].info) {
      outStr = `${outStr}${commands[cmd].info}\n`
    }
    const commandArgs = commands[cmd].args
    Object.keys(commandArgs).forEach((arg) => {
      outStr = `${outStr}\t--${arg}:\n`
      const argObj = commandArgs[arg]
      if (has.call(argObj, 'info')) {
        outStr = `${outStr}\t\t${argObj.info}\n`
      }
      if (has.call(argObj, 'default')) {
        outStr = `${outStr}\t\t(Default: ${argObj.default})\n`
      }
      if (argObj.required) {
        outStr = `${outStr}\t\t(Required)\n`
      }
    })
    console.log(outStr)
  })
}

module.exports = {
  help,
  encode,
  decode,
}
