/* global assert:true, it, beforeEach, describe */
/* global navigator, process */
/* jshint -W101 */
'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
} else {
  var assert = require('assert');
  var L10n = {
    PropertiesParser: process.env.L20N_COV ?
      require('../../../build/cov/lib/l20n/parser')
      : require('../../../lib/l20n/format/properties/parser')
  };
}

describe('Quadratic Blowup', function(){
  var source;

  beforeEach(function() {
    source = [
    '# Project Gutenberg\'s Alice\'s Adventures in Wonderland,',
    '# by Lewis Carroll',
    '#',
    '# This eBook is for the use of anyone anywhere at no cost and with',
    '# almost no restrictions whatsoever.  You may copy it, give it away',
    '# or re-use it under the terms of the Project Gutenberg License',
    '# included with this eBook or online at www.gutenberg.org',

    'alice=\\',

    ' CHAPTER I. Down the Rabbit-Hole\\',

    ' Alice was beginning to get very tired of sitting by her sister on\\',
    ' the bank, and of having nothing to do: once or twice she had peeped\\',
    ' into the book her sister was reading, but it had no pictures or\\',
    ' conversations in it, \'and what is the use of a book,\' thought\\',
    ' Alice \'without pictures or conversation?\'\\',

    ' So she was considering in her own mind (as well as she could, for\\',
    ' the hot day made her feel very sleepy and stupid), whether the\\',
    ' pleasure of making a daisy-chain would be worth the trouble of\\',
    ' getting up and picking the daisies, when suddenly a White Rabbit\\',
    ' with pink eyes ran close by her.\\',

    ' There was nothing so VERY remarkable in that; nor did Alice think\\',
    ' it so VERY much out of the way to hear the Rabbit say to itself,\\',
    ' \'Oh dear!  Oh dear! I shall be late!\' (when she thought it over\\',
    ' afterwards, it occurred to her that she ought to have wondered at\\',
    ' this, but at the time it all seemed quite natural); but when the\\',
    ' Rabbit actually TOOK A WATCH OUT OF ITS WAISTCOAT-POCKET, and\\',
    ' looked at it, and then hurried on, Alice started to her feet, for\\',
    ' it flashed across her mind that she had never before seen a rabbit\\',
    ' with either a waistcoat-pocket, or a watch to take out of it, and\\',
    ' burning with curiosity, she ran across the field after it, and\\',
    ' fortunately was just in time to see it pop down a large rabbit-hole\\',
    ' under the hedge.\\',

    ' In another moment down went Alice after it, never once considering\\',
    ' how in the world she was to get out again.\\',

    ' The rabbit-hole went straight on like a tunnel for some way, and\\',
    ' then dipped suddenly down, so suddenly that Alice had not a moment\\',
    ' to think about stopping herself before she found herself falling\\',
    ' down a very deep well.',

    'malice=\\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} \\',
    '   {{alice}} {{alice}} {{alice}} {{alice}} {{alice}} {{alice}}'
    ].join('\n');
  });

  it('throws', function() {
    assert.throws(function() {
      L10n.PropertiesParser.parse(null, source);
    }, /too many placeables/i);
  });
});
