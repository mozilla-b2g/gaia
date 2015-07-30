/* global require, Buffer */

// This replaces xml2dict.py, using WordListConverter shared with
// KeyboardSettingsApp.

// Unlike xml2dict.py, we don't care |flags| at all as the attribute is not used
// anywhere.

// Original comments follow.

/*
This script reads a XML-formatted word list and produces a dictionary
file used by the FirefoxOS virtual keyboard for word suggestions and
auto corrections.

The word lists come from the Android source:
https://android.googlesource.com/
                  platform/packages/inputmethods/LatinIME/+/master/dictionaries/

This script currently depends on the XML format of the Android
wordlists. (Eventually we might want to pre-process the XML files
to a plain text format and simplify this script so that it will work
with any plain-text word and frequency list)

The sample.xml file from the Android repo looks like this:

----------------------------------------------------------------------

    <!-- This is a sample wordlist that can be converted to a binary
         dictionary for use by the Latin IME. The format of the word
         list is a flat list of word entries. Each entry has a frequency
         between 255 and 0. Highest frequency words get more weight in
         the prediction algorithm. As a special case, a weight of 0 is
         taken to mean profanity - words that should not be considered a
         typo, but that should never be suggested explicitly. You can
         capitalize words that must always be capitalized, such as
         "January". You can have a capitalized and a non-capitalized
         word as separate entries, such as "robin" and "Robin". -->

    <wordlist>
      <w f="255">this</w>
      <w f="255">is</w>
      <w f="128">sample</w>
      <w f="1">wordlist</w>
    </wordlist>
----------------------------------------------------------------------

This script processes the word list and converts it to a Ternary
Search Tree (TST), as described in the wiki link below, also in

  http://en.wikipedia.org/wiki/Ternary_search_tree
  http://www.strchr.com/ternary_dags
  http://www.strchr.com/dawg_predictive

Note that the script does not convert the tree into a DAG (by sharing
common word suffixes) because it cannot maintain separate frequency
data for each word if the words share nodes.

We have moved the documentation (format and example) for the dictionary blob to
Mozilla Wiki:
https://wiki.mozilla.org/Gaia/System/Keyboard/IME/Latin/Dictionary_Blob

Please make sure any updates to the codes are reflected in the wiki too.

*/

'use strict';

var fs = require('fs');

var WordListConverter =
  require('../../../settings/word_list_converter.js').WordListConverter;

var argv = require('yargs')
  .demand(1)
  .demand('o')
  .alias('o', 'output')
  .describe('o', 'write output to this file')
  .usage('Usage: $0 -o lang.dict lang_wordlist.xml')
  .argv;

var parser = new require('xml2js').Parser();

console.log('Reading XML file...');

var xmlContent = fs.readFileSync(argv._[0], {encoding: 'utf8'});

console.log('Parsing XML file...');

parser.parseString(xmlContent, function(error, results){
  if (error) {
    console.error('XML Parser Error:', error);
    return;
  }

  console.log('Finished parsing.');

  // from xml results to {w: 'word', f: FREQ_INT}
  var words = results.wordlist.w.map(function(wNode){
    return {
      w: wNode._,
      f: parseInt(wNode.$.f)
    };
  });

  var highestFreq = words[0].f;

  // normalize frequency to [0, 1)
  words = words.map(function(word){
    return {
      w: word.w,
      f: word.f / (highestFreq + 1)
    };
  });

  console.log('Generating TST Tree...');

  var blob = new WordListConverter(words).toBlob();

  fs.writeFile(argv.o, new Buffer(new Uint8Array(blob)), 'binary', function(e){
    if (e){
      console.error('Error:', e);
    } else {
      console.log('Finished.');
    }
  });
});
