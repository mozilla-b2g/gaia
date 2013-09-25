'use strict';

requireApp('fl/js/binary_string_view.js');

suite('BinaryStringView tests', function() {
  var testStrings = [
    'abcabcabc',
    ' abcabcabc',
    'abcabcabc ',
    ' abcabcabc ',
    ' \r\n\t abcabcabc \r\n\t ',
    ''
  ];

  testStrings.forEach(function(s) {
    test('String "' + s + '"', function() {
      var bsv = new BinaryStringView(s);
      assert.equal(s.length, bsv.length, 'length');
      assert.equal(s, bsv.toString(), 'toString');
      assert.equal(s.trim(), bsv.trim().toString(), 'trim');

      assert.equal(s.slice(0), bsv.slice(0).toString(), 'slice(0)');
      assert.equal(s.slice(1), bsv.slice(1).toString(), 'slice(1)');
      assert.equal(s.slice(-1), bsv.slice(-1).toString(), 'slice(-1)');
      assert.equal(s.slice(-2), bsv.slice(-2).toString(), 'slice(-2)');
      assert.equal(s.slice(1, 2), bsv.slice(1, 2).toString(), 'slice(1,2)');
      assert.equal(s.slice(1, -1), bsv.slice(1, -1).toString(), 'slice(1,-1)');

      assert.equal(s.indexOf(''), bsv.indexOf(''), 'indexOf("")');
      assert.equal(s.indexOf('', 1), bsv.indexOf('', 1), 'indexOf("",1)');
      assert.equal(s.indexOf('a'), bsv.indexOf('a'), 'indexOf(a)');
      assert.equal(s.indexOf('a', 2), bsv.indexOf('a', 2), 'indexOf(a,2)');
      assert.equal(s.indexOf('bca'), bsv.indexOf('bca'), 'indexOf(bca)');
      assert.equal(s.indexOf('bca', 6), bsv.indexOf('bca', 6),
                   'indexOf(bca,6)');
      assert.equal(s.indexOf('\r\n'), bsv.indexOf('\r\n'), 'indexOf(\\r\\n)');
      assert.equal(s.indexOf('\r\n', 8), bsv.indexOf('\r\n', 8),
                   'indexOf(\\r\\n, 8)');
      assert.equal(s.indexOf('abcabcabc'), bsv.indexOf('abcabcabc'),
                   'indexOf(abcabcabc)');
      assert.equal(s.indexOf(s), bsv.indexOf(s), 'indexOf(s)');
      assert.equal(s.indexOf(s, 3), bsv.indexOf(s, 3), 'indexOf(s, 3)');

      assert.equal(s.lastIndexOf(''), bsv.lastIndexOf(''),
                   'lastIndexOf("")');
      assert.equal(s.lastIndexOf('', 1), bsv.lastIndexOf('', 1),
                   'lastIndexOf("",1)');
      assert.equal(s.lastIndexOf('a'), bsv.lastIndexOf('a'),
                   'lastIndexOf(a)');
      assert.equal(s.lastIndexOf('a', 2), bsv.lastIndexOf('a', 2),
                   'lastIndexOf(a,2)');
      assert.equal(s.lastIndexOf('bca'), bsv.lastIndexOf('bca'),
                   'lastIndexOf(bca)');
      assert.equal(s.lastIndexOf('bca', 6), bsv.lastIndexOf('bca', 6),
                   'lastIndexOf(bca,6)');
      assert.equal(s.lastIndexOf('\r\n'), bsv.lastIndexOf('\r\n'),
                   'lastIndexOf(\\r\\n)');
      assert.equal(s.lastIndexOf('\r\n', 8), bsv.lastIndexOf('\r\n', 8),
                   'lastIndexOf(\\r\\n, 8)');

      assert.equal(s.lastIndexOf('abcabcabc'), bsv.lastIndexOf('abcabcabc'),
                   'lastIndexOf(abcabcabc)');
      assert.equal(s.lastIndexOf(s), bsv.lastIndexOf(s),
                   'lastIndexOf(s)');
      assert.equal(s.lastIndexOf(s, 3), bsv.lastIndexOf(s, 3),
                   'lastIndexOf(s, 3)');
    });
  });
});
