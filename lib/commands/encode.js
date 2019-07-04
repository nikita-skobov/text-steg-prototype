const {
  verifyAndFillOptions
} = require('../utils')

function encode(cliObj) {
  const opts = verifyAndFillOptions(cliObj, encodeCommand.args)
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
