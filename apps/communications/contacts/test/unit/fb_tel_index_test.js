require('/shared/js/fb/fb_tel_index.js');

suite('Telephone Prefix Indexes test', function() {
  var Tree;
  var id = 1234;
  var number = '655890765';

  suiteSetup(function() {
    Tree = Object.create(null);
    TelIndexer.index(Tree, number, id);
  });

  suiteTeardown(function() {
    Tree = null;
  });

  function assertFound(result) {
    assert.equal(result.length, 1);
    assert.equal(result[0], id);
  }

  function assertNotFound(result) {
    assert.equal(result.length, 0);
  }

  test('Find the whole number', function() {
    assertFound(TelIndexer.search(Tree, number));
  });

  test('Partial find. Length insufficient', function() {
    var result = TelIndexer.search(Tree, '65');
    assert.equal(result.length, 0);
  });

  test('Partial find. Minimum length', function() {
    assertFound(TelIndexer.search(Tree, '655'));
  });

  test('Partial find. Start', function() {
    assertFound(TelIndexer.search(Tree, '6558'));
  });

  test('Partial find. Middle', function() {
    assertFound(TelIndexer.search(Tree, '58907'));
  });

  test('Partial find. End', function() {
    assertFound(TelIndexer.search(Tree, '765'));
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
    TelIndexer.remove(Tree, number, id);
    assertNotFound(TelIndexer.search(Tree, number));
    assertNotFound(TelIndexer.search(Tree, '655'));
  });
});
