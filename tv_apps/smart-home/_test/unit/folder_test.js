'use strict';

/* global Deck, Folder */

require('/bower_components/evt/index.js');
require('/shared/js/uuid.js');
require('/shared/js/smart-screen/cards/card.js');
require('/shared/js/smart-screen/cards/deck.js');
require('/shared/js/smart-screen/cards/folder.js');

suite('Folder', function() {
  var folder;
  var stubFolder;
  var deck;

  var assertFolderIsEmpty = function() {
    assert.isTrue(folder.cardsInFolder.length === 0);
  };

  setup(function() {
    folder = new Folder({
      name: 'folder under test'
    });
    deck = new Deck({
      nativeApp: {},
      name: 'a deck'
    });
    stubFolder = new Folder({
      name: 'folder as stub'
    });
  });

  teardown(function() {
    folder = undefined;
  });

  test('should be able to add deck into folder', function() {
    assertFolderIsEmpty();
    folder.addCard(deck);
    assert.equal(folder.cardsInFolder[0], deck);
    assert.equal(folder.state, Folder.STATES.DIRTY);
  });

  test('should not be able to add folder into folder', function() {
    assertFolderIsEmpty();
    folder.addCard(stubFolder);
    assertFolderIsEmpty();
    assert.equal(folder.state, Folder.STATES.NORMAL);
  });

  test('should be able to remove deck from folder', function() {
    folder.cardsInFolder[0] = deck;

    folder.removeCard(deck);
    assertFolderIsEmpty();
    assert.equal(folder.state, Folder.STATES.DIRTY);
  });

});
