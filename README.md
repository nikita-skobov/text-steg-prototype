# text-steg-prototype

This is a prototype implementation of a text-to-text steganography application.

This project can take any arbitrary source file and encode it by taking a nibblet map and shuffling the map for each nibblet of the source file. (nibblet = 4 bits, ie: file is 1024 bytes = 2048 nibblets).
The map is shuffled via a seed using the sfc32 random number generator which has a 128 bit state. 
To decode the encoded output file, you must use the same seed as when encoding.

* [Installation](#installation)
* [Usage](#usage)
* [How it Works](#how-it-works)

## Installation:
```sh
git clone https://github.com/nikita-skobov/text-steg-prototype.git
cs text-steg-prototype
npm install
npm link
# if you want to remove the symbolic link, just do
# npm unlink while inside this directory.
```


## Usage:

### Simple usage example:
```sh
# to encode:
text-steg encode --file LICENSE --seed mysecretseed
# generates a file called encoded.txt

# to decode:
text-steg decode --file output.txt --seed mysecretseed
# generates a file called decoded.txt
```

### Advanced usage example:
```sh
# to encode:
text-steg encode --file LICENSE --output LICENSE.encoded.txt --seed mysecretseed --word-seed someotherseed --n 7 --words mycustomfile.txt

# This will use a word seed which will randomize the output differently for every
# different word seed. You might want to use a word seed in case you don't like
# the output you got originally.

# This uses an N-gram with depth 7 which is fairly large. Make sure your computer
# has enough memory for this.

# This also uses a custom words file in case you want to use a different corpus
# other than the one provided in pg14833.txt

# This also outputs to a custom file name instead of the default which is encoded.txt
```

### Full usage:
text-steg
```
USAGE: text-steg [COMMAND] --[OPTIONS]

Commands:
help:
Display all of the commands and options

decode:
given an encoded file, decode it and output the decoded data to a new file.
        --seed:
                If encoded with a seed, the same seed
                must be provided when decoding.
                (Default: abc)
        --file:
                The name of the file which contains encoded text
                (Required)
        --output:
                The name of the file that will output the
                decoded text.
                (Default: decoded.txt)

encode:
given any file, encode it and output the encoded data to a new file.
        --seed:
                a seed that, if provided, must be also provided
                when decoding in order to retrieve
                the original data.
                (Default: abc)
        --file:
                name of the file that will be encoded.
                (Required)
        --output:
                name of the file that will output
                the encoded text.
                (Default: encoded.txt)
        --word-seed:
                used to seed the word generation.
                this seed does not affect encoding or decoding.
        --words:
                name of the corpus to use when generating
                the n-gram structure for word prediction.
                (Default: pg14833.txt)
        --n:
                size of the n-gram structure.
                (Default: 2)
        --typos:
                this number affects how many characters
                the word picker can remove from a word
                to fit the encoding.
                (Default: 0)
        --max-lines:
                if your words corpus is very large, you can limit
                how many lines get read into memory.
```


## How it works:

Start with a map to map bits that are set to characters:
```js
{
  0: 'e',
  1: 's',
  2: 'i',
  4: 'a',
  8: 'n',
}
```

As an example we will use a text file that contains a single space. space in UTF-8 has a decimal value of 32. or in hex: 20. This application would take the first nibblet which is 2 in hex, and find all of the bits that are set:
```js
// bits: 0 0 1 0
```

For each bit that is set, take the character that the bit maps to:
In this example, only the 2nd LSB is set, so we take the letter i from the map above. Then we move on to the next nibblet in the source file (0 in hex):
```js
// bits: 0 0 0 0
```
In this case we see that no bits are set, but rather than outputting an empty string, we explicitly use the character that maps to 0 which is the letter e.
**This is important because it allows us to use 'skip words'.** skip words are words that do not contain any of the characters in the map above. So when the decoder encounters a word that does not contain any characters in the map, it can skip that word. This allows the encoded text to look more natural.

However, what we forgot to do is to shuffle our map. The map is shuffled using a random number generator that is seeded with a seed we specified.
In this case our map now becomes:
```js
{
  0: 'n',
  1: 'e',
  2: 'a',
  4: 'i',
  8: 's',
}
```
So the value 0 actually maps to the letter 'n'.

Now, we have an array of gibberish words (we call them words, even though in this example they are single characters):
```js
const words = ['i', 'n']
```

Next we generate an n-gram map of our given text file (by default we use a book from project gutenberg, but you can use any text file you wish). By default we use N = 2, but you can change N by specifying `--n <any number you want>`

We then create a currentWords array:
```js
const currentWords = seedCurrentWords(N)
```

This is seeded with some initial random words that are common in the corpus.
We then generate a list of words that can occur after these N words. We iterate over our gibberish words and find predicted words that contain only characters in the current gibberish word. for example, the current word is 'i'. If the predicted words array contains the word 'i' that is a perfect word. Another possible candidate is 'if', or 'film'. However, 'is', is not a valid candidate because 'is' contains the letter s, which is in our original map.

If we cannot find any words that fit our current gibberish word, we do a 'stupid backoff' of N. We decrease N by 1, and generate a new list of predicted words, this time using only the last N words from currentWords to make the predicted list. We keep decreasing N until we hit a list of unigrams, ie: a list of all words in the corpus text. If we still cannot find a word that fits our gibberish word, we consider this a failure, and include the gibberish word as is in our output.

In our example the program generated:
`i dont`
Where the 'i' maps to 2,
and the 'n' in dont maps to 0.
And when we decode this file, we must specify the same seed, so that the map gets shuffled exactly the same every time. We now get back our original unencoded text, which was a single space.



This project uses a text file from project gutenberg:
**Varney the Vampire; Or, the Feast of Blood by Thomas Preskett Prest**

This book was chosen because it is one of the largest books available
on gutenberg.

You can choose to use any text file you wish. The project was designed with books from project gutenberg in mind, so if you wish to use a different type of corpus, please see the lib/ngrams.js file to see how the text files are parsed, and modify as fits your needs.

The book can be obtained from:
https://www.gutenberg.org/ebooks/14833


Gutenberg says to include this sentence:
```
This eBook is for the use of anyone anywhere at no cost and with
almost no restrictions whatsoever.  You may copy it, give it away or
re-use it under the terms of the Project Gutenberg License included
with this eBook or online at www.gutenberg.net
```