'use strict';

/* global WordListConverter */

require('/js/settings/word_list_converter.js');

suite('WordListConverter', function() {
  var expected;
  var actual;

  // Our test strategy is very simple here: we feed a few word lists into the
  // converter and see if the resulting blob is the same as the hard-coded
  // "correct" blob.
  //
  // Indeed, there is possible further improvement for this test strategy: 
  // For example, in the character frequency table, the order of same-frequency
  // characters should not matter. Within the same level of the TST, the order
  // of nodes linked by next pointers should not matter either (assuming they
  // have the same frequency).
  //
  // Ultimately, we might still need to take such ordering-neutral comparison
  // into consideration when we test the blobs, some day, if the underlying JS
  // implementation used by the converter changes and if such change modifies
  // the ordering assumed in the "correct" blob.

  // This test script starts with simple tests. Tests become more and more
  // complex (with differnet unicode character sets and combinations) in later
  // suites. If more than one tests fail, it is wise to fix simple tests first,
  // such as latin, before looking to complex ones such as Hindi/Emoji.

  // For binary structure of a dictionary blob, please see:
  // https://wiki.mozilla.org/Gaia/System/Keyboard/IME/Latin/Dictionary
  // The hardcoded blob may serve as extra examples for that wiki page.

  var compareBlobs = function(actual, expected) {
    for (var i = 0; i < actual.length; i++) {
      assert.strictEqual(actual[i], expected[i], `position ${ i } differs`);
    }

    assert.equal(actual.length, expected.length, 'length of two blobs differs');
  };

  test('Blob type is ArrayBuffer', function(){
    assert.instanceOf(new WordListConverter(['a']).toBlob(), ArrayBuffer);
  });

  suite('Basic latin characters', function() {
    test('single word', function(){
      actual = new Uint8Array(new WordListConverter(['apple']).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54, // FxOSDICT
        0x0, 0x0, 0x0, 0x1,             // Unused bytes, version 1
        0x5,                            // longest word is 5-char long
        0x0, 0x4,                       // four characters in char table
        0x0, 0x70, 0x0, 0x0, 0x0, 0x2,  // p, global occurrence = 2
        0x0, 0x61, 0x0, 0x0, 0x0, 0x1,  // a, global occurrence = 1
        0x0, 0x6c, 0x0, 0x0, 0x0, 0x1,  // l, global occurrence = 1
        0x0, 0x65, 0x0, 0x0, 0x0, 0x1,  // e, global occurrence = 1
        0x9f, 0x61,                     // TST tree follow...
        0x9f, 0x70,
        0x9f, 0x70,
        0x9f, 0x6c,
        0x9f, 0x65,
        0x1f
      ]);
    
      compareBlobs(actual, expected);
    });

    test('multiple words', function(){
      actual = new Uint8Array(new WordListConverter(
        ['apple', 'orange', 'apply', 'organic', 'blueberry']).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0x9,                            // longest word is 9-char long
        0x0, 0xd,                       // 13 characters in char table
        0x0, 0x61, 0x0, 0x0, 0x0, 0x4,
        0x0, 0x70, 0x0, 0x0, 0x0, 0x4,
        0x0, 0x65, 0x0, 0x0, 0x0, 0x4,
        0x0, 0x72, 0x0, 0x0, 0x0, 0x4,
        0x0, 0x6c, 0x0, 0x0, 0x0, 0x3,
        0x0, 0x6f, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x6e, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x67, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x79, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x62, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x69, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x63, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x75, 0x0, 0x0, 0x0, 0x1,
        0xbf, 0x61, 0x0, 0x0, 0x2f,     // root node 'a', with next pointer
        0x9f, 0x70,                     // center node 'p'
        0x9f, 0x70,                     // center node 'p'
        0x9f, 0x6c,                     // center node 'l'
        0xbf, 0x65, 0x0, 0x0, 0x11,     // center node 'e', with next pointer
        0x1f,                           // EndOfWord
        0x9f, 0x79,                     // node 'y', next-pointed from 'e' above
        0x1f,                           // EndOfWord
        0x9f, 0x6f,                     // node 'o', next-pointed from root 'b'
        0x9f, 0x72,                     // center node 'r'
        0xbf, 0x61, 0x0, 0x0, 0x24,     // center node 'a', with next pointer
        0x9f, 0x6e,                     // center node 'n'
        0x9f, 0x67,                     // center node 'g'
        0x9f, 0x65,                     // center node 'e'
        0x1f,                           // EndOfWord
        0x9f, 0x67,                     // node 'g', next-pointed from 'a' above
        0x9f, 0x61,                     // node 'a'
        0x9f, 0x6e,                     // node 'n'
        0x9f, 0x69,                     // node 'i'
        0x9f, 0x63,                     // node 'c'
        0x1f,                           // EndOfWord
        0xbf, 0x62, 0x0, 0x0, 0x14,     // node 'b', next-pointed by root 'a'
                                        // and next-point to 'o' on 0x14
        0x9f, 0x6c,                     // node 'l'
        0x9f, 0x75,                     // node 'u'
        0x9f, 0x65,                     // node 'e'
        0x9f, 0x62,                     // node 'b'
        0x9f, 0x65,                     // node 'e'
        0x9f, 0x72,                     // node 'r'
        0x9f, 0x72,                     // node 'r'
        0x9f, 0x79,                     // node 'y'
        0x1f                            // EndOfWord
      ]);

      compareBlobs(actual, expected);
    });

    // Uppercase/lowercase/diacritics are treated as different characters.
    test('captilization', function(){
      actual = new Uint8Array(new WordListConverter(
        ['mozIlla', 'Mozilla', 'mozilla', 'MOZILLA']).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0x7,
        0x0, 0xc,
        0x0, 0x6c, 0x0, 0x0, 0x0, 0x6,
        0x0, 0x6f, 0x0, 0x0, 0x0, 0x3,
        0x0, 0x7a, 0x0, 0x0, 0x0, 0x3,
        0x0, 0x61, 0x0, 0x0, 0x0, 0x3,
        0x0, 0x6d, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x49, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x4d, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x69, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x4c, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x4f, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x5a, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x41, 0x0, 0x0, 0x0, 0x1,
        0xbf, 0x4d, 0x0, 0x0, 0x22,     // 'M', next is 'm' at 0x22
        0xbf, 0x4f, 0x0, 0x0, 0x15,     // 'O', next is 'o' at 0x15
        0x9f, 0x5a,                     // 'Z'
        0x9f, 0x49,                     // 'I'
        0x9f, 0x4c,                     // 'L'
        0x9f, 0x4c,                     // 'L'
        0x9f, 0x41,                     // 'A'
        0x1f,
        0x9f, 0x6f,                     // 'o'
        0x9f, 0x7a,                     // 'z'
        0x9f, 0x69,                     // 'i'
        0x9f, 0x6c,                     // 'l'
        0x9f, 0x6c,                     // 'l'
        0x9f, 0x61,                     // 'a'
        0x1f,
        0x9f, 0x6d,                     // 'm'
        0x9f, 0x6f,                     // 'o'
        0x9f, 0x7a,                     // 'z'
        0xbf, 0x49, 0x0, 0x0, 0x34,     // 'i', next is 'I' at 0x34
        0x9f, 0x6c,                     // 'l'
        0x9f, 0x6c,                     // 'l'
        0x9f, 0x61,                     // 'a'
        0x1f,
        0x9f, 0x69,                     // 'I'
        0x9f, 0x6c,                     // 'l'
        0x9f, 0x6c,                     // 'l'
        0x9f, 0x61,                     // 'a'
        0x1f
      ]);

      compareBlobs(actual, expected);
    });

    test('diacritics', function(){
      actual = new Uint8Array(new WordListConverter(
        ['mÖz', 'Ɱoz', 'Moz', 'mOz', 'ḿoƶ']).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0x3,
        0x0, 0x9,
        0x0, 0x7a, 0x0, 0x0, 0x0, 0x4,
        0x0, 0x6f, 0x0, 0x0, 0x0, 0x3,
        0x0, 0x6d, 0x0, 0x0, 0x0, 0x2,
        0x0, 0xd6, 0x0, 0x0, 0x0, 0x1,
        0x2c, 0x6e, 0x0, 0x0, 0x0, 0x1,     // 'Ɱ' (\u2c6e)
        0x0, 0x4d, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x4f, 0x0, 0x0, 0x0, 0x1,
        0x1e, 0x3f, 0x0, 0x0, 0x0, 0x1,     // 'ḿ' (\u1e3f)
        0x1, 0xb6, 0x0, 0x0, 0x0, 0x1,      // 'ƶ' (\u01b6)
        0xbf, 0x4d, 0x0, 0x0, 0x16,
        0x9f, 0x6f,
        0x9f, 0x7a,
        0x1f,
        0xff, 0x1e, 0x3f, 0x0, 0x0, 0x28,   // 2-byte char 'ḿ' with next pointer
        0x9f, 0x6f,
        0xdf, 0x1, 0xb6,                    // 2-byte char 'ƶ' as center node
        0x1f,
        0xbf, 0x6d, 0x0, 0x0, 0xa,
        0xbf, 0x4f, 0x0, 0x0, 0x23,
        0x9f, 0x7a,
        0x1f,
        0x9f, 0xd6,
        0x9f, 0x7a,
        0x1f,
        0xdf, 0x2c, 0x6e,                   // 2-byte char 'Ɱ'
        0x9f, 0x6f,
        0x9f, 0x7a,
        0x1f
      ]);

      compareBlobs(actual, expected);
    });
  });

  // Although we don't really expect the presence of non-latin characters in the
  // blob, we still need to check that the converter won't fail (either "soft"
  // failure by encoding wrong data (that would affect latin prediction) or a
  // "strong" failure by throwing an error) when fed with such characters.

  // The following "correct" blobs are manually pre-tested to make sure they
  // still produce latin-character predictions correctly.
  // (Actually, I believe CJK predictions should also work, as long as we have a
  //  sensible |nearByKeys| structure, but... there is no such structure that
  //  can be (even remotely) sensible.)
  suite('CJK characters', function() {
    test('basic CJK test with only CJK chars', function(){
      actual = new Uint8Array(new WordListConverter(
        // The words are Hello / Good Morning / Good Evening in CJK.
        ['你好', '你好嗎', 'こんにちは', 'こんばんは', '안녕하세요']).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0x5,                                // longest word is 5-char long
        0x0, 0xe,                           // 14 characters in char table
        0x30, 0x93, 0x0, 0x0, 0x0, 0x3,
        0x4f, 0x60, 0x0, 0x0, 0x0, 0x2,
        0x59, 0x7d, 0x0, 0x0, 0x0, 0x2,
        0x30, 0x53, 0x0, 0x0, 0x0, 0x2,
        0x30, 0x6f, 0x0, 0x0, 0x0, 0x2,
        0x55, 0xce, 0x0, 0x0, 0x0, 0x1,
        0x30, 0x6b, 0x0, 0x0, 0x0, 0x1,
        0x30, 0x61, 0x0, 0x0, 0x0, 0x1,
        0x30, 0x70, 0x0, 0x0, 0x0, 0x1,
        0xc5, 0x48, 0x0, 0x0, 0x0, 0x1,
        0xb1, 0x55, 0x0, 0x0, 0x0, 0x1,
        0xd5, 0x58, 0x0, 0x0, 0x0, 0x1,
        0xc1, 0x38, 0x0, 0x0, 0x0, 0x1,
        0xc6, 0x94, 0x0, 0x0, 0x0, 0x1,
        0xff, 0x30, 0x53, 0x0, 0x0, 0x30,   // 'こ', next-point to '你'
        0xdf, 0x30, 0x93,                   // 'ん'
        0xff, 0x30, 0x6b, 0x0, 0x0, 0x16,   // 'に', next-point to 'ば'
        0xdf, 0x30, 0x61,                   // 'ち'
        0xdf, 0x30, 0x6f,                   // 'は'
        0x1f,
        0xdf, 0x30, 0x70,                   // 'ば'
        0xdf, 0x30, 0x93,                   // 'ん'
        0xdf, 0x30, 0x6f,                   // 'は'
        0x1f,
        0xdf, 0xc5, 0x48,                   // '안' 
        0xdf, 0xb1, 0x55,                   // '녕'
        0xdf, 0xd5, 0x58,                   // '하'
        0xdf, 0xc1, 0x38,                   // '세'
        0xdf, 0xc6, 0x94,                   // '요'
        0x1f,
        0xff, 0x4f, 0x60, 0x0, 0x0, 0x20,   // '你', next-point to '안'
        0xdf, 0x59, 0x7d,                   // '好'
        0x3f, 0x0, 0x0, 0x3d,               // EndOfWord, next-point to '嗎'
        0xdf, 0x55, 0xce,                   // '嗎'
        0x1f
      ]);

      compareBlobs(actual, expected);
    });

    // the test is crafted that the composing bytes of the chinese characters
    // (e.g. 0x4f = 'O', 0x59 = 'Y', 0x55 = 'U', 0xce = 'Î') are re-used, as
    // single-byte latin chars, appearing in other words.
    // again, the "correct" blob has been pre-tested to make sure that the
    // prediction of those single-byte latin chars works.
    test('CJK+latin chars', function(){
      actual = new Uint8Array(new WordListConverter(
        ['SAY', 'SUB', '你好', 'LATÎN', 'LATIN', 'SON', 'RON',
         '你好嗎', 'RUN', 'run', '好嗎', 'Uni', 'UnÎdentity']).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0xa,
        0x0, 0x17,
        0x0, 0x4e, 0x0, 0x0, 0x0, 0x5,
        0x0, 0x55, 0x0, 0x0, 0x0, 0x4,
        0x0, 0x6e, 0x0, 0x0, 0x0, 0x4,
        0x0, 0x53, 0x0, 0x0, 0x0, 0x3,
        0x0, 0x41, 0x0, 0x0, 0x0, 0x3,
        0x59, 0x7d, 0x0, 0x0, 0x0, 0x3,
        0x4f, 0x60, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x4c, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x54, 0x0, 0x0, 0x0, 0x2,
        0x0, 0xce, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x4f, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x52, 0x0, 0x0, 0x0, 0x2,
        0x55, 0xce, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x69, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x74, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x59, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x42, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x49, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x72, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x75, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x64, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x65, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x79, 0x0, 0x0, 0x0, 0x1,
        0xbf, 0x4c, 0x0, 0x0, 0x3a,
        0x9f, 0x41,
        0x9f, 0x54,
        0xbf, 0x49, 0x0, 0x0, 0x11,
        0x9f, 0x4e,
        0x1f,
        0x9f, 0xce,
        0x9f, 0x4e,
        0x1f,
        0xbf, 0x72, 0x0, 0x0, 0x71,
        0x9f, 0x75,
        0x9f, 0x6e,
        0x1f,
        0xbf, 0x53, 0x0, 0x0, 0x4c,
        0xbf, 0x41, 0x0, 0x0, 0x32,
        0x9f, 0x59,
        0x1f,
        0x9f, 0x55,
        0x9f, 0x42,
        0x1f,
        0xbf, 0x4f, 0x0, 0x0, 0x2d,
        0x9f, 0x4e,
        0x1f,
        0xbf, 0x52, 0x0, 0x0, 0x20,
        0xbf, 0x4f, 0x0, 0x0, 0x47,
        0x9f, 0x4e,
        0x1f,
        0x9f, 0x55,
        0x9f, 0x4e,
        0x1f,
        0xbf, 0x55, 0x0, 0x0, 0x16,
        0x9f, 0x6e,
        0xbf, 0x69, 0x0, 0x0, 0x59,
        0x1f,
        0x9f, 0xce,
        0x9f, 0x64,
        0x9f, 0x65,
        0x9f, 0x6e,
        0x9f, 0x74,
        0x9f, 0x69,
        0x9f, 0x74,
        0x9f, 0x79,
        0x1f,
        0xdf, 0x59, 0x7d,
        0xdf, 0x55, 0xce,
        0x1f,
        0xff, 0x4f, 0x60, 0x0, 0x0, 0x6a,
        0xdf, 0x59, 0x7d,
        0x3f, 0x0, 0x0, 0x7e,
        0xdf, 0x55, 0xce,
        0x1f
      ]);

      compareBlobs(actual, expected);
    });
  });

  // Our entire architecture has little (if any) regard to unicode combining
  // characters such as Devanagari in Hindi, and treat each one unicode char as
  // ...just one indepedent character. Still, we need to test if the converter
  // maintains such treatment, and like how we're testing in CJK, whether those
  // characters won't interfere with latin chars.
  suite('Hindi', function() {
    test('basic Hindi chars with only Hindi chars', function(){
      // The words are translated from "Hi", "Good morning" and "Thank you".
      actual = new Uint8Array(new WordListConverter(
        ['नमस्ते', 'सुप्रभात', 'शुक्रिया']).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0x8,
        0x0, 0xf,
        0x9, 0x4d, 0x0, 0x0, 0x0, 0x3,
        0x9, 0x38, 0x0, 0x0, 0x0, 0x2,
        0x9, 0x24, 0x0, 0x0, 0x0, 0x2,
        0x9, 0x41, 0x0, 0x0, 0x0, 0x2,
        0x9, 0x30, 0x0, 0x0, 0x0, 0x2,
        0x9, 0x3e, 0x0, 0x0, 0x0, 0x2,
        0x9, 0x28, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x2e, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x47, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x2a, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x2d, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x36, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x15, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x3f, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x2f, 0x0, 0x0, 0x0, 0x1,
        0xff, 0x9, 0x28, 0x0, 0x0, 0x2f,
        0xdf, 0x9, 0x2e,
        0xdf, 0x9, 0x38,
        0xdf, 0x9, 0x4d,
        0xdf, 0x9, 0x24,
        0xdf, 0x9, 0x47,
        0x1f,
        0xdf, 0x9, 0x38,
        0xdf, 0x9, 0x41,
        0xdf, 0x9, 0x2a,
        0xdf, 0x9, 0x4d,
        0xdf, 0x9, 0x30,
        0xdf, 0x9, 0x2d,
        0xdf, 0x9, 0x3e,
        0xdf, 0x9, 0x24,
        0x1f,
        0xff, 0x9, 0x36, 0x0, 0x0, 0x16,
        0xdf, 0x9, 0x41,
        0xdf, 0x9, 0x15,
        0xdf, 0x9, 0x4d,
        0xdf, 0x9, 0x30,
        0xdf, 0x9, 0x3f,
        0xdf, 0x9, 0x2f,
        0xdf, 0x9, 0x3e,
        0x1f
      ]);

      compareBlobs(actual, expected);
    });

    // similar to CJK+latin test. we re-use 0x4d = 'M', 0x38 = '8', 0x41 = 'A',
    // 0x47 = 'G', 0x3f = '?' here.
    test('Hindi+latin chars', function(){
      actual = new Uint8Array(new WordListConverter(
        ['Apple?', 'नमस्ते', 'MAGAZINE', 'Game',
         'सुप्रभात', 'AM?', 'शुक्रिया']).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0x8,
        0x0, 0x1c,
        0x0, 0x41, 0x0, 0x0, 0x0, 0x4,
        0x9, 0x4d, 0x0, 0x0, 0x0, 0x3,
        0x0, 0x70, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x65, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x3f, 0x0, 0x0, 0x0, 0x2,
        0x9, 0x38, 0x0, 0x0, 0x0, 0x2,
        0x9, 0x24, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x4d, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x47, 0x0, 0x0, 0x0, 0x2,
        0x9, 0x41, 0x0, 0x0, 0x0, 0x2,
        0x9, 0x30, 0x0, 0x0, 0x0, 0x2,
        0x9, 0x3e, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x6c, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x28, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x2e, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x47, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x5a, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x49, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x4e, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x45, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x61, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x6d, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x2a, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x2d, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x36, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x15, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x3f, 0x0, 0x0, 0x0, 0x1,
        0x9, 0x2f, 0x0, 0x0, 0x0, 0x1,
        0xbf, 0x41, 0x0, 0x0, 0x42,
        0xbf, 0x4d, 0x0, 0x0, 0xd,
        0x9f, 0x3f,
        0x1f,
        0x9f, 0x70,
        0x9f, 0x70,
        0x9f, 0x6c,
        0x9f, 0x65,
        0x9f, 0x3f,
        0x1f,
        0xff, 0x9, 0x28, 0x0, 0x0, 0x67,
        0xdf, 0x9, 0x2e,
        0xdf, 0x9, 0x38,
        0xdf, 0x9, 0x4d,
        0xdf, 0x9, 0x24,
        0xdf, 0x9, 0x47,
        0x1f,
        0xbf, 0x4d, 0x0, 0x0, 0x18,
        0x9f, 0x41,
        0x9f, 0x47,
        0x9f, 0x41,
        0x9f, 0x5a,
        0x9f, 0x49,
        0x9f, 0x4e,
        0x9f, 0x45,
        0x1f,
        0xbf, 0x47, 0x0, 0x0, 0x2e,
        0x9f, 0x61,
        0x9f, 0x6d,
        0x9f, 0x65,
        0x1f,
        0xdf, 0x9, 0x38,
        0xdf, 0x9, 0x41,
        0xdf, 0x9, 0x2a,
        0xdf, 0x9, 0x4d,
        0xdf, 0x9, 0x30,
        0xdf, 0x9, 0x2d,
        0xdf, 0x9, 0x3e,
        0xdf, 0x9, 0x24,
        0x1f,
        0xff, 0x9, 0x36, 0x0, 0x0, 0x4e,
        0xdf, 0x9, 0x41,
        0xdf, 0x9, 0x15,
        0xdf, 0x9, 0x4d,
        0xdf, 0x9, 0x30,
        0xdf, 0x9, 0x3f,
        0xdf, 0x9, 0x2f,
        0xdf, 0x9, 0x3e,
        0x1f
      ]);

      compareBlobs(actual, expected);
    });
  });

  // Emoji characters on the supplimentary plane allow us to make sure surrogate
  // pairs don't break. Indeed they shouldn't -- the converter should just treat
  // them as two unicode "chars".
  // We're getting into no man's land here, more so than Hindi's combining
  // chars -- The original xml2dict.py can't even properly encode unicode chars
  // outside BMP range since it expects a character to be at most 2 bytes.
  suite('Emoji', function() {
    // To make the tests more tangible (to human readers) those emojis are
    // separately defined as const with their UTF-8 surrogate pair
    // representation commented.
    const emoSmile = '😀';    // '\ud83d\ude00'
    const emoCar = '🚘';      // '\ud83d\ude98'
    const emoTennis = '🎾';   // '\ud83c\udfbe'
    const emoChesnut = '🌰';  // '\ud83c\udf30'

    test('basic Emoji', function(){
      actual = new Uint8Array(new WordListConverter(
        [emoSmile,
         emoSmile + emoCar,
         emoTennis + emoChesnut + emoCar]).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0x6,
        0x0, 0x6,
        0xd8, 0x3d, 0x0, 0x0, 0x0, 0x4,
        0xde, 0x0, 0x0, 0x0, 0x0, 0x2,
        0xde, 0x98, 0x0, 0x0, 0x0, 0x2,
        0xd8, 0x3c, 0x0, 0x0, 0x0, 0x2,
        0xdf, 0xbe, 0x0, 0x0, 0x0, 0x1,
        0xdf, 0x30, 0x0, 0x0, 0x0, 0x1,
        0xff, 0xd8, 0x3c, 0x0, 0x0, 0x16,
        0xdf, 0xdf, 0xbe,
        0xdf, 0xd8, 0x3c,
        0xdf, 0xdf, 0x30,
        0xdf, 0xd8, 0x3d,
        0xdf, 0xde, 0x98,
        0x1f,
        0xdf, 0xd8, 0x3d,
        0xdf, 0xde, 0x0,
        0x3f, 0x0, 0x0, 0x20,
        0xdf, 0xd8, 0x3d,
        0xdf, 0xde, 0x98,
        0x1f
      ]);

      compareBlobs(actual, expected);
    });

    // again we reuse some single byte from the emoji surrogate pairs in
    // the CJK/latin characters here, to check whether the converter doesn't
    // mess up.
    // 0x3c = '<', 0x3d = '=', 0x30 = '0'
    // \u5398 = '厘', \u58be = '墾'
    // \u30de = 'マ', \u30df = 'ミ'
    // \u30d8 = 'ヘ' (note: this is Katagana "he", not Hiragana)
    // マスタークラス is "Master Class" in Japanese
    // 墾丁 is a tourist spot in Taiwan
    // 厘米 is a way to say centimeter in Chinese
    // ミリメートル is millimeter in Japanese
    test('Emoji + CJK and latin words', function(){
      actual = new Uint8Array(new WordListConverter(
        ['<' + emoChesnut + '>',
         'マスター' + '=' + emoCar + '=' + 'クラス',
         emoTennis + '墾丁',
         emoCar + '厘米' + 'ミリメートル' + emoChesnut,
         emoSmile + 'ヘ' + emoCar,
         emoSmile
        ]).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0xc,
        0x0, 0x19,
        0xd8, 0x3d, 0x0, 0x0, 0x0, 0x5,
        0xd8, 0x3c, 0x0, 0x0, 0x0, 0x3,
        0xde, 0x98, 0x0, 0x0, 0x0, 0x3,
        0xdf, 0x30, 0x0, 0x0, 0x0, 0x2,
        0x30, 0xb9, 0x0, 0x0, 0x0, 0x2,
        0x30, 0xfc, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x3d, 0x0, 0x0, 0x0, 0x2,
        0xde, 0x0, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x3c, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x3e, 0x0, 0x0, 0x0, 0x1,
        0x30, 0xde, 0x0, 0x0, 0x0, 0x1,
        0x30, 0xbf, 0x0, 0x0, 0x0, 0x1,
        0x30, 0xaf, 0x0, 0x0, 0x0, 0x1,
        0x30, 0xe9, 0x0, 0x0, 0x0, 0x1,
        0xdf, 0xbe, 0x0, 0x0, 0x0, 0x1,
        0x58, 0xbe, 0x0, 0x0, 0x0, 0x1,
        0x4e, 0x1, 0x0, 0x0, 0x0, 0x1,
        0x53, 0x98, 0x0, 0x0, 0x0, 0x1,
        0x7c, 0x73, 0x0, 0x0, 0x0, 0x1,
        0x30, 0xdf, 0x0, 0x0, 0x0, 0x1,
        0x30, 0xea, 0x0, 0x0, 0x0, 0x1,
        0x30, 0xe1, 0x0, 0x0, 0x0, 0x1,
        0x30, 0xc8, 0x0, 0x0, 0x0, 0x1,
        0x30, 0xeb, 0x0, 0x0, 0x0, 0x1,
        0x30, 0xd8, 0x0, 0x0, 0x0, 0x1,
        0xbf, 0x3c, 0x0, 0x0, 0x1e,
        0xdf, 0xd8,
        0x3c, 0xdf,
        0xdf, 0x30,
        0x9f, 0x3e,
        0x1f,
        0xff, 0xd8, 0x3c, 0x0, 0x0, 0x41,
        0xdf, 0xdf, 0xbe,
        0xdf, 0x58, 0xbe,
        0xdf, 0x4e, 0x1,
        0x1f,
        0xff, 0x30, 0xde, 0x0, 0x0, 0xe,
        0xdf, 0x30, 0xb9,
        0xdf, 0x30, 0xbf,
        0xdf, 0x30, 0xfc,
        0x9f, 0x3d,
        0xdf, 0xd8, 0x3d,
        0xdf, 0xde, 0x98,
        0x9f, 0x3d,
        0xdf, 0x30, 0xaf,
        0xdf, 0x30, 0xe9,
        0xdf, 0x30, 0xb9,
        0x1f,
        0xdf, 0xd8, 0x3d,
        0xff, 0xde, 0x0, 0x0, 0x0, 0x58,
        0x3f, 0x0, 0x0, 0x4e,
        0xdf, 0x30, 0xd8,
        0xdf, 0xd8, 0x3d,
        0xdf, 0xde, 0x98,
        0x1f,
        0xdf, 0xde, 0x98,
        0xdf, 0x53, 0x98,
        0xdf, 0x7c, 0x73,
        0xdf, 0x30, 0xdf,
        0xdf, 0x30, 0xea,
        0xdf, 0x30, 0xe1,
        0xdf, 0x30, 0xfc,
        0xdf, 0x30, 0xc8,
        0xdf, 0x30, 0xeb,
        0xdf, 0xd8, 0x3c,
        0xdf, 0xdf, 0x30,
        0x1f
      ]);

      compareBlobs(actual, expected);
    });
  });

  suite('Word list with frequency information', function() {
    suite('Rejections', function() {
      var dummy;
      test('Reject mixed input', function(){
        assert.throws(() => {
          dummy =
            new WordListConverter(['simpleword', {w: 'anotherword', f: 0.5}]);
        }, /^Type mismatch\. previous: \S+, this: \S+$/);

        assert.throws(() => {
          dummy =
            new WordListConverter([{w: 'simpleword', f: 0.5}, 'anotherword']);
        }, /^Type mismatch\. previous: \S+, this: \S+$/);
      });

      test('Reject object elements without proper fields', function(){
        assert.throws(() => {
          dummy = new WordListConverter([{f: 0.5}]);
        }, /^"w" field not found in word$/);

        assert.throws(() => {
          dummy = new WordListConverter([{w: 'word'}]);
        }, /^"f" field not found in word$/);

        assert.throws(() => {
          dummy = new WordListConverter([{w: 'word', f: 1}]);
        }, /^"f" value not in allowed range$/);

        assert.throws(() => {
          dummy = new WordListConverter([{w: 'word', f: 100}]);
        }, /^"f" value not in allowed range$/);

        assert.throws(() => {
          dummy = new WordListConverter([{w: 'word', f: 255}]);
        }, /^"f" value not in allowed range$/);
      });
    });

    test('multiple words including capitalization differences', function(){
      actual = new Uint8Array(new WordListConverter(
        [{w: 'apple', f: 0.5},
         {w: 'origami', f: 0.18},
         {w: 'orange', f: 0.6},
         {w: 'apply', f: 0.8},
         {w: 'organic', f: 0.7},
         {w: 'blueberry', f: 0.15},
         {w: 'asymptotic', f: 0.2},
         {w: 'Asia', f: 0.75}
        ]).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0xa,
        0x0, 0x11,
        0x0, 0x61, 0x0, 0x0, 0x0, 0x7,
        0x0, 0x70, 0x0, 0x0, 0x0, 0x5,
        0x0, 0x72, 0x0, 0x0, 0x0, 0x5,
        0x0, 0x69, 0x0, 0x0, 0x0, 0x5,
        0x0, 0x65, 0x0, 0x0, 0x0, 0x4,
        0x0, 0x6f, 0x0, 0x0, 0x0, 0x4,
        0x0, 0x6c, 0x0, 0x0, 0x0, 0x3,
        0x0, 0x67, 0x0, 0x0, 0x0, 0x3,
        0x0, 0x79, 0x0, 0x0, 0x0, 0x3,
        0x0, 0x6d, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x6e, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x63, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x62, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x73, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x74, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x75, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x41, 0x0, 0x0, 0x0, 0x1,
        0xb9, 0x61, 0x0, 0x0, 0x2a,     // root node 'a' as 'apply' is highest
                                        // freq; 0xb9 = 0b10111001
                                        // (c and n bits set, freq = 25),
                                        // 25 is the frequency of 'apply', i.e.
                                        // the most-frequent word from 'a'
        0xb9, 0x70, 0x0, 0x0, 0x17,     // second level 'p' as 'apply' is more
                                        // frequent than 'asymptotic'
        0x99, 0x70,                     // 0x99 = 0b10011001 (c bit set, f = 25)
        0x99, 0x6c,
        0xb9, 0x79, 0x0, 0x0, 0x14,     // 'y' of apply, with next to 'e', as
                                        // 'apply' is more frequent than 'apple'
        0x19,                           // EoW of 'apply', freq = 25
        0x90, 0x65,                     // 'e', freq = 16
        0x10,                           // EoW of 'apple', freq = 16
        0x87, 0x73,                     // 's', next-pointed from second-level
                                        // 'p' below root-level 'a'
                                        // freq = 7
        0x87, 0x79,
        0x87, 0x6d,
        0x87, 0x70,
        0x87, 0x74,
        0x87, 0x6f,
        0x87, 0x74,
        0x87, 0x69,
        0x87, 0x63,
        0x7,                            // EoW of 'asymptotic'
        0xb8, 0x41, 0x0, 0x0, 0x36,     // root-level 'A' as next-pointed by
                                        // root 'a', as 'Asia' is the second
                                        // frequent (than 'apply') and more
                                        // frequent than 'organic and
                                        // 'blueberry'. freq = 24,
                                        // 24 is the frequency of 'Asia', i.e.
                                        // the most-frequent word from 'A'
        0x98, 0x73,
        0x98, 0x69,
        0x98, 0x61,
        0x18,                           // EoW of 'Asia'
        0xb6, 0x6f, 0x0, 0x0, 0x62,     // root-level 'o' as next-pointed by
                                        // root 'A', as 'o' is the next frequent
                                        // and freq = 22, frequency of 'organic'
        0x96, 0x72,                     // 'r'
        0xb6, 0x67, 0x0, 0x0, 0x4b,     // 3rd-level 'g', next to 'a'. freq = 22
                                        // = freq of 'organic'
        0x96, 0x61,
        0x96, 0x6e,
        0x96, 0x69,
        0x96, 0x63,
        0x16,                           // EoW of 'organic'
        0xb3, 0x61, 0x0, 0x0, 0x57,     // 3rd-level 'a', next-pointed by
                                        // 3rd-level 'g', below 'o' -> 'r';
                                        // with a next pointer to 'i' as
                                        // 'origami' freq is lower than 'orange'
                                        // frequency is 19 = freq of 'orange'
        0x93, 0x6e,
        0x93, 0x67,
        0x93, 0x65,
        0x13,                           // EoW of 'orange', freq = 19
        0x86, 0x69,                     // 3rd-level 'i', next-pointed by
                                        // 3rd-level 'a', below 'o' -> 'r';
                                        // freq is 6 = freq of 'origami'
        0x86, 0x67,
        0x86, 0x61,
        0x86, 0x6d,
        0x86, 0x69,
        0x6,                            // EoW of 'origami'
        0x85, 0x62,                     // root-level 'b' as nexted-pointed by
                                        // root-level 'o'; no more next pointers
                                        // freq = 5 i.e. freq of 'blueberry'
        0x85, 0x6c,
        0x85, 0x75,
        0x85, 0x65,
        0x85, 0x62,
        0x85, 0x65,
        0x85, 0x72,
        0x85, 0x72,
        0x85, 0x79,
        0x5                             // EoW of 'blueberry'
      ]);

      compareBlobs(actual, expected);
    });

    test('word freqency = 0 is properly honored', function(){
      actual = new Uint8Array(new WordListConverter(
        [{w: 'apple', f: 0.5},
         {w: 'toxicapple', f: 0}]).toBlob());

      expected = new Uint8Array([
        0x46, 0x78, 0x4f, 0x53, 0x44, 0x49, 0x43, 0x54,
        0x0, 0x0, 0x0, 0x1,
        0xa,
        0x0, 0x9,
        0x0, 0x70, 0x0, 0x0, 0x0, 0x4,
        0x0, 0x61, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x6c, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x65, 0x0, 0x0, 0x0, 0x2,
        0x0, 0x74, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x6f, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x78, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x69, 0x0, 0x0, 0x0, 0x1,
        0x0, 0x63, 0x0, 0x0, 0x0, 0x1,
        0xb0, 0x61, 0x0, 0x0, 0xe,      // root 'a', next to 't', freq = 16
        0x90, 0x70,
        0x90, 0x70,
        0x90, 0x6c,
        0x90, 0x65,
        0x10,                           // EoW of 'apple', freq = 16
        0x80, 0x74,                     // root-next 't', freq = 0
        0x80, 0x6f,
        0x80, 0x78,
        0x80, 0x69,
        0x80, 0x63,
        0x80, 0x61,
        0x80, 0x70,
        0x80, 0x70,
        0x80, 0x6c,
        0x80, 0x65,
        0x0                             // EoW of 'toxicapple', freq = 0
      ]);
    
      compareBlobs(actual, expected);
    });
  });
});
