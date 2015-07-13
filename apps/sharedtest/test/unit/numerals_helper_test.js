'use strict';

require('/shared/js/numerals_helper.js');

suite('Numerals Helper >>', function(done) {

  var nh;
  var testNode;

  suiteSetup(function() {
    nh = window.NumeralsHelper;

    var att = document.createAttribute('data-intl-numerals');
    var testedText = document.createTextNode('Old MacDonald has 300 cows');

    testNode = document.createElement('div');
    testNode.setAttributeNode(att);
    testNode.appendChild(testedText);
  });

  suite('Conversion from: ', function() {
    test('Western to Eastern Numerals', function() {
      nh._cnvEAWA(true, testNode);
      assert.equal(testNode.textContent, 'Old MacDonald has ٣٠٠ cows');
    });

    test('Eastern to Western Numerals', function() {
      nh._cnvEAWA(false, testNode);
      assert.equal(testNode.textContent, 'Old MacDonald has 300 cows');
    });
  });

});
