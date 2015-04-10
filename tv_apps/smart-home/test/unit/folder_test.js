'use strict';

/* global Deck, Folder, Application */

require('/bower_components/evt/index.js');
require('/shared/js/uuid.js');
require('/shared/js/smart-screen/cards/card.js');
require('/shared/js/smart-screen/cards/application.js');
require('/shared/js/smart-screen/cards/deck.js');
require('/shared/js/smart-screen/cards/folder.js');

suite('Folder', function() {
  var folder;
  var stubFolder;
  var nonEmptyFolder;
  var apps;
  var deck;

  var eventSpy;

  setup(function() {
    apps = {
      music: new Application({
        name: 'Music',
        nativeApp: {
          name: 'Music',
          removable: false,
          manifest: {},
          manifestURL: 'app://music.gaiamobile.org/manifest.webapp'
        }
      }),
      video: new Application({
        name: 'Video',
        nativeApp: {
          name: 'Video',
          removable: false,
          manifest: {},
          manifestURL: 'app://video.gaiamobile.org/manifest.webapp'
        }
      }),
      gallery: new Application({
        name: 'Gallery',
        nativeApp: {
          name: 'Gallery',
          removable: false,
          manifest: {},
          manifestURL: 'app://gallery.gaiamobile.org/manifest.webapp'
        }
      })
    };

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

    nonEmptyFolder = new Folder({
      name: 'non empty',
      _cardsInFolder: [apps.music, apps.video, apps.gallery]
    });

    eventSpy = this.sinon.spy();
    nonEmptyFolder.on('folder-changed', eventSpy);
    nonEmptyFolder.on('card-inserted', eventSpy);
    nonEmptyFolder.on('card-removed', eventSpy);
    nonEmptyFolder.on('card-updated', eventSpy);
    nonEmptyFolder.on('card-swapped', eventSpy);
  });

  teardown(function() {
    folder = undefined;
    deck = undefined;
    stubFolder = undefined;
    nonEmptyFolder = undefined;
    apps = undefined;
    eventSpy = undefined;
  });

  var assertFolderIsEmpty = function(target) {
    assert.isTrue(target._cardsInFolder.length === 0);
  };

  var assertFolderIsDirty = function(target) {
    assert.equal(target.state, Folder.STATES.DIRTY);
  };

  test('should be able to add deck into folder', function() {
    assertFolderIsEmpty(folder);
    folder.addCard(deck);
    assert.equal(folder.getCardList()[0], deck);
    assertFolderIsDirty(folder);
  });

  test('should not be able to add folder into folder', function() {
    assertFolderIsEmpty(stubFolder);
    folder.addCard(stubFolder);
    assertFolderIsEmpty(stubFolder);
    assert.equal(stubFolder.state, Folder.STATES.NORMAL);
  });

  test('should be able to remove deck from folder', function() {
    folder.getCardList()[0] = deck;

    folder.removeCard(deck);
    assertFolderIsEmpty(folder);
    assertFolderIsDirty(folder);
  });

  test('should be able to update card in folder', function() {
    var index = 0;
    var cardToBeUpdated = nonEmptyFolder.getCardList()[index];
    cardToBeUpdated.name = 'new gallery';

    assert.isFalse(eventSpy.called);
    nonEmptyFolder.updateCard(cardToBeUpdated, index);
    assert.equal(
      nonEmptyFolder.getCardList()[0].cardId, cardToBeUpdated.cardId);
    assert.equal(nonEmptyFolder.getCardList()[0].name, cardToBeUpdated.name);
    assert.isTrue(eventSpy.calledWithExactly(nonEmptyFolder));
    assert.isTrue(eventSpy.calledWithExactly(cardToBeUpdated, index));
    assertFolderIsDirty(nonEmptyFolder);
  });

  test('should be able to swap cards in folder', function() {
    var card1 = nonEmptyFolder.getCardList()[0];
    var card2 = nonEmptyFolder.getCardList()[2];

    assert.isFalse(eventSpy.called);
    nonEmptyFolder.swapCard(card1, card2);
    assert.equal(nonEmptyFolder.getCardList()[0], card2);
    assert.equal(nonEmptyFolder.getCardList()[2], card1);
    assert.isTrue(eventSpy.calledWithExactly(nonEmptyFolder));
    assert.isTrue(eventSpy.calledWithExactly(card2, card1, 0, 2));
    assertFolderIsDirty(nonEmptyFolder);
  });
});
