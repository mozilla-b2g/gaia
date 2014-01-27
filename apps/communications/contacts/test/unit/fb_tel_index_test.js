'use strict';

/* globals TelIndexer */

require('/shared/js/fb/fb_tel_index.js');
require('/shared/js/binary_search.js');

suite('Telephone Prefix Indexes test', function() {
  var Tree;
  var ids = ['1234', '4567'];
  var numbers = ['655890765', '655890700'];

  suiteSetup(function() {
    Tree = [];
    TelIndexer.index(Tree, numbers[0], ids[0]);
    TelIndexer.index(Tree, numbers[1], ids[1]);
    TelIndexer.orderTree(Tree);
  });

  suiteTeardown(function() {
    Tree = null;
  });

  function assertFound(result, target) {
    assert.equal(result.length, target.length);
    for (var j = 0; j < target.length; j++) {
      assert.isTrue(result.indexOf(target[j]) !== -1);
    }
  }

  function assertNotFound(result) {
    assert.equal(result.length, 0);
  }

  test('Find the whole number', function() {
    assertFound(TelIndexer.search(Tree, numbers[0]), [ids[0]]);
    assertFound(TelIndexer.search(Tree, numbers[1]), [ids[1]]);
  });

  test('Partial find. Length insufficient', function() {
    var result = TelIndexer.search(Tree, '65');
    assert.equal(result.length, 0);
  });

  test('Partial find. Minimum length', function() {
    assertFound(TelIndexer.search(Tree, '655'), ids);
  });

  test('Partial find. Start', function() {
    assertFound(TelIndexer.search(Tree, '6558'), ids);
  });

  test('Partial find. Middle', function() {
    assertFound(TelIndexer.search(Tree, '58907'), ids);
  });

  test('Partial find. End', function() {
    assertFound(TelIndexer.search(Tree, '765'), [ids[0]]);
  });

   test('Match. Middle', function() {
    assertFound(TelIndexer.search(Tree, '89070'), [ids[1]]);
  });

  test('No match. End', function() {
    assertNotFound(TelIndexer.search(Tree, '767'));
  });

  test('No match. Start', function() {
    assertNotFound(TelIndexer.search(Tree, '65519'));
  });

  test('No match. Last number differs', function() {
    assertNotFound(TelIndexer.search(Tree, '655890764'));
  });

  test('No match. Middle', function() {
    assertNotFound(TelIndexer.search(Tree, '89074'));
  });

  test('Remove a tel number. No longer found', function() {
    TelIndexer.remove(Tree, numbers[0], ids[0]);
    assertNotFound(TelIndexer.search(Tree, numbers[0]));
    assertNotFound(TelIndexer.search(Tree, '89076'));
  });
});
