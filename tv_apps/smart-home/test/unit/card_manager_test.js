'use strict';
/* global Application, CardManager, Deck, Folder, AsyncSemaphore,
          MockCardStore, MockPipedPromise, MockXMLHttpRequest */

require('/bower_components/evt/index.js');
require('/shared/js/async_semaphore.js');
require('/shared/js/uuid.js');
require('/shared/js/smart-screen/shared_utils.js');
require('/shared/test/unit/mocks/mock_piped_promise.js');
require('/shared/test/unit/mocks/mock_card_store.js');
require('/shared/test/unit/mocks/mock_xml_http_request.js');
require('/shared/js/smart-screen/cards/card.js');
require('/shared/js/smart-screen/cards/deck.js');
require('/shared/js/smart-screen/cards/folder.js');
require('/shared/js/smart-screen/cards/application.js');

suite('smart-home/CardManager', function() {
  var realPipedPromise;
  var decks;
  var apps;
  var folders;

  suiteSetup(function(done) {
    realPipedPromise = window.PipedPromise;
    // real PipedPromise will make test failed because it waits for
    // last promise to be resolved. But we need to call done in the last
    // promise. So we use a MockPipedPromise (which is just a genuine native
    // Promise) instead.
    window.PipedPromise = MockPipedPromise;

    decks = {
      dashboard: new Deck({
        name: {
          raw: 'Dashboard'
        },
        group: 'dashboard',
        nativeApp: {
          name: 'Dashboard',
          removable: false,
          manifest: {},
          manifestURL: 'app://dashboard.gaiamobile.org/manifest.webapp'
        }
      }),
      tv: new Deck({
        name: {
          raw: 'TV'
        },
        group: 'tv',
        nativeApp: {
          name: 'TV',
          removable: false,
          manifest: {},
          manifestURL: 'app://tv-deck.gaiamobile.org/manifest.webapp'
        }
      })
    };

    apps = {
      music: new Application({
        name: {
          raw: 'Music'
        },
        group: 'application',
        nativeApp: {
          name: 'Music',
          removable: false,
          manifest: {},
          manifestURL: 'app://music.gaiamobile.org/manifest.webapp'
        }
      }),
      video: new Application({
        name: {
          raw: 'Video'
        },
        group: 'application',
        nativeApp: {
          name: 'Video',
          removable: false,
          manifest: {},
          manifestURL: 'app://video.gaiamobile.org/manifest.webapp'
        }
      }),
      gallery: new Application({
        name: {
          raw: 'Gallery'
        },
        group: 'application',
        nativeApp: {
          name: 'Gallery',
          removable: false,
          manifest: {},
          manifestURL: 'app://gallery.gaiamobile.org/manifest.webapp'
        }
      })
    };

    folders = {
      emptyOne: new Folder({
        name: {
          raw: 'New Empty Folder'
        }
      }),
      emptyTwo: new Folder({
        name: {
          raw: 'New Empty Folder 2'
        }
      }),
      nonEmpty: new Folder({
        name: {
          raw: 'Non Empty'
        },
        _cardsInFolder: [apps.video, apps.gallery]
      })
    };

    require('/shared/js/smart-screen/card_manager.js', function() {
      done();
    });
  });

  suiteTeardown(function() {
    decks = undefined;
    apps = undefined;
    folders = undefined;
    window.PipedPromise = realPipedPromise;
  });

  function prepareCardManagerForTesting() {
    var result = new CardManager();
    // We bypass init() because it involves navigator.mozApps.mgmt
    // Instead we need to prepare necessary properties of cardManager
    result._asyncSemaphore = new AsyncSemaphore();
    result._cardStore = MockCardStore;

    result._cardList = [
      decks.dashboard,
      apps.music,
      decks.tv,
      folders.nonEmpty
    ];

    result.installedApps = {
      'app://dashboard.gaiamobile.org/manifest.webapp': {
        name: 'Dashboard',
        removable: false,
        manifest: {},
        manifestURL: 'app://dashboard.gaiamobile.org/manifest.webapp'
      },
      'app://music.gaiamobile.org/manifest.webapp': {
        name: 'Music',
        removable: false,
        manifest: {},
        manifestURL: 'app://music.gaiamobile.org/manifest.webapp'
      },
      'app://tv-deck.gaiamobile.org/manifest.webapp': {
        name: 'TV',
        removable: false,
        manifest: {},
        manifestURL: 'app://tv-deck.gaiamobile.org/manifest.webapp'
      },
      'app://video.gaiamobile.org/manifest.webapp': {
        name: 'Video',
        removable: false,
        manifest: {},
        manifestURL: 'app://video.gaiamobile.org/manifest.webapp'
      },
      'app://gallery.gaiamobile.org/manifest.webapp': {
        name: 'Gallery',
        removable: false,
        manifest: {},
        manifestURL: 'app://gallery.gaiamobile.org/manifest.webapp'
      },
    };

    return result;
  }

  suite('_bestMatchingIcon()', function() {
    var cardManager;
    var app;
    var manifestWithIconsInOrder = {
      icons: {
        '32': '/style/icons/32.png',
        '64': '/style/icons/64.png',
        '128': '/style/icons/128.png',
        '256': '/style/icons/256.png'
      }
    };
    var manifestWithIconsInRandom = {
      icons: {
        '32': '/style/icons/32.png',
        '256': '/style/icons/256.png',
        '128': '/style/icons/128.png',
        '64': '/style/icons/64.png'
      }
    };

    setup(function() {
      cardManager = new CardManager();
      app = {
        origin: 'app://stub.gaiamobile.org/'
      };
    });

    teardown(function() {
      cardManager = undefined;
      app = undefined;
    });

    test('call without preferredSize', function() {
      var actual = cardManager._bestMatchingIcon(app, manifestWithIconsInOrder);
      assert.equal(actual, 'app://stub.gaiamobile.org/style/icons/256.png');
    });

    test('call with random order of icon size and ' +
      'without preferredSize ', function() {
      var actual =
        cardManager._bestMatchingIcon(app, manifestWithIconsInRandom);
      assert.equal(actual, 'app://stub.gaiamobile.org/style/icons/256.png');
    });

    test('call with preferredSize', function() {
      var actual =
        cardManager._bestMatchingIcon(app, manifestWithIconsInOrder, 100);
      assert.equal(actual, 'app://stub.gaiamobile.org/style/icons/128.png');
    });

    test('call with random order of icon size and ' +
      'preferredSize ', function() {
      var actual =
        cardManager._bestMatchingIcon(app, manifestWithIconsInRandom, 100);
      assert.equal(actual, 'app://stub.gaiamobile.org/style/icons/128.png');
    });

  });

  suite('_reloadCardList()', function() {
    var cardManager;
    var realXMLHttpRequest;

    setup(function() {
      cardManager = new CardManager();
      // We bypass init() because it involves navigator.mozApps.mgmt
      // Instead we need to prepare necessary properties of cardManager
      cardManager._cardList = [];
      cardManager._cardStore = MockCardStore;
      cardManager._asyncSemaphore = new AsyncSemaphore();
      realXMLHttpRequest = window.XMLHttpRequest;
      window.XMLHttpRequest = MockXMLHttpRequest;
      this.sinon.spy(cardManager, 'writeCardlistInCardStore');
    });

    teardown(function() {
      MockCardStore.mClearData();
      window.XMLHttpRequest = realXMLHttpRequest;
      cardManager = undefined;
    });

    test('should load cardList from datastore if possible', function(done) {
      MockCardStore.mPrepareData('cardList', [{
        'name': 'Television',
        'type': 'Deck'
      }]);

      cardManager._reloadCardList().then(function() {
        assert.isTrue(cardManager._cardList.length > 0);
        assert.equal(cardManager._cardList[0].name, 'Television');
      }).then(done, done);
    });

    test('should load cardList from file if nothing in datastore',
      function(done) {
        cardManager._reloadCardList().then(function() {
          assert.isTrue(cardManager._cardList.length > 0);
          assert.equal(cardManager._cardList[0].name, 'Devices');
          assert.isTrue(cardManager.writeCardlistInCardStore.calledOnce);
        }, function(reason) {
          assert.fail('should not reject promise due to ' + reason);
        }).then(done, done);

        // XXX: We should remove window.setTimeout in test but since we are
        // guarding this test with done(), let's just put it as is until we
        // have better solution
        window.setTimeout(function() {
          MockXMLHttpRequest.triggerReadyStateChange({
            status: 200,
            response: {
              'card_list': [{
                  'name': 'Devices',
                  'type': 'Deck'
              }]
            }
          });
        });
      });

  });

  suite('findCardFromCardList()', function() {
    var cardManager;
    var dashboardCardId;
    var folderCardId;

    setup(function() {
      cardManager = prepareCardManagerForTesting();
      dashboardCardId = cardManager._cardList[0].cardId;
      folderCardId = cardManager._cardList[3].cardId;
    });

    teardown(function() {
      MockCardStore.mClearData();
      cardManager = undefined;
      dashboardCardId = undefined;
      folderCardId = undefined;
    });

    test('should find card based on cardId', function() {
      var card = cardManager.findCardFromCardList({
        cardId: dashboardCardId
      });
      assert.equal(card.name.raw, 'Dashboard');
    });

    test('should find folder based on cardId', function() {
      var card = cardManager.findCardFromCardList({
        cardId: folderCardId
      });
      assert.isTrue(card instanceof Folder);
      assert.equal(card.name.raw, 'Non Empty');
    });

    test('should return undefined by querying non-existing launchURL',
      function() {
        var card = cardManager.findCardFromCardList({
          manifestURL: 'app://tv-deck.gaiamobile.org/manifest.webapp',
          launchURL: 'app://tv-deck.gaiamobile.org/#42'
        });

      assert.isUndefined(card);
    });

    test('should return undefined if not found', function() {
      var card = cardManager.findCardFromCardList({
        cardId: 'incorrect-card-id'
      });
      assert.isUndefined(card);
    });

    test('should find card inside of folder', function() {
      var card = cardManager.findCardFromCardList({
        manifestURL: 'app://video.gaiamobile.org/manifest.webapp'
      });
      assert.equal(card.name.raw, 'Video');
    });

    test('should be able to find folder by querying via cardEntry', function() {
      var folderEntry = folders.nonEmpty.serialize();
      var card = cardManager.findCardFromCardList({
        cardEntry: folderEntry
      });
      assert.equal(card, folders.nonEmpty);
    });
  });

  suite('getFilteredCardList()', function() {
    var cardManager;

    setup(function() {
      cardManager = prepareCardManagerForTesting();
    });

    teardown(function() {
      MockCardStore.mClearData();
      cardManager = undefined;
    });

    test('should get only apps if filter="application"', function(done) {
      var filter = 'application';
      cardManager.getFilteredCardList(filter).then(function(cards) {
        assert.isTrue(cards.length === 1);
      }).then(done, done);
    });

    test('should get all cards if filter="all"', function(done) {
      var filter = 'all';
      cardManager.getFilteredCardList(filter).then(function(cards) {
        assert.isTrue(cards.length === cardManager._cardList.length);
      }).then(done, done);
    });

    test('should get empty array if filter is undefined', function(done) {
      cardManager.getFilteredCardList().then(function(cards) {
        assert.isTrue(cards.length === 0);
      }).then(done, done);
    });
  });

  suite('insertNewFolder()', function() {
    var cardManager;
    var dashboardCardId;

    setup(function() {
      cardManager = new CardManager();
      // We bypass init() because it involves navigator.mozApps.mgmt
      // Instead we need to prepare necessary properties of cardManager
      cardManager._asyncSemaphore = new AsyncSemaphore();
      cardManager._cardStore = MockCardStore;
      cardManager._cardList = [decks.dashboard];
      cardManager.installedApps = {
        'app://dashboard.gaiamobile.org/manifest.webapp': {
          name: 'Dashboard',
          removable: false,
          manifest: {},
          manifestURL: 'app://dashboard.gaiamobile.org/manifest.webapp'
        }
      };
      dashboardCardId = cardManager._cardList[0].cardId;

      this.sinon.spy(cardManager, 'writeFolderInCardStore');
      this.sinon.spy(cardManager, 'writeCardlistInCardStore');
    });

    teardown(function() {
      MockCardStore.mClearData();
      cardManager = undefined;
    });

    test('should return new folder instance whenever a new folder is inserted',
      function() {
        var newFolder = cardManager.insertNewFolder('an empty folder');

        assert.ok(newFolder.folderId);
        assert.equal(newFolder.state, Folder.STATES.DETACHED);
      });

    test('should write to data store when folder has content', function() {
      var newFolder = cardManager.insertNewFolder('a test folder');
      assert.isFalse(cardManager.writeCardlistInCardStore.calledOnce);
      newFolder.addCard(new Application({
        name: 'Music',
        group: 'application'
      }));

      assert.isTrue(cardManager.writeCardlistInCardStore.calledOnce);
    });

    test('should insert at correct location if index is specified', function() {
      var targetLocation = 0;
      var newFolder =
        cardManager.insertNewFolder('a test folder', targetLocation);
      assert.isFalse(cardManager.writeCardlistInCardStore.calledOnce);
      newFolder.addCard(apps.music);

      assert.isTrue(cardManager.writeCardlistInCardStore.calledOnce);
      assert.equal(cardManager._cardList[targetLocation], newFolder);
    });

  });

  suite('insertCard()', function() {
    var cardManager;

    setup(function() {
      cardManager = prepareCardManagerForTesting();
    });

    teardown(function() {
      MockCardStore.mClearData();
      cardManager = undefined;
    });

    test('should not be able to insert the same card twice', function() {
      var expectedCardListLength = cardManager._cardList.length;
      cardManager.insertCard({
        cardEntry: {
          'type': 'Application',
          'group': 'app',
          'manifestURL': 'app://music.gaiamobile.org/manifest.webapp'
        }
      });
      assert.equal(cardManager._cardList.length, expectedCardListLength);
    });

    test('should be able to insert same app twice with different launchURL',
      function() {
        var expectedCardListLength = cardManager._cardList.length + 1;
        cardManager.insertCard({
          cardEntry: {
            'type': 'Application',
            'group': 'tv',
            'manifestURL': 'app://tv-deck.gaiamobile.org/manifest.webapp',
            'launchURL': 'app://tv-deck.gaiamobile.org/#42'
          }
        });
        assert.equal(cardManager._cardList.length, expectedCardListLength);
      });

  });

  suite('removeCard()', function() {
    var cardManager;
    setup(function() {
      cardManager = prepareCardManagerForTesting();
    });

    teardown(function() {
      MockCardStore.mClearData();
      cardManager = undefined;
    });

    test('should be able to remove card with index specified', function() {
      assert.ok(
        cardManager.findCardFromCardList({
          manifestURL: 'app://music.gaiamobile.org/manifest.webapp'})
      );

      cardManager.removeCard(1); // remove card of 'Music' app

      assert.isUndefined(
        cardManager.findCardFromCardList({
          manifestURL: 'app://music.gaiamobile.org/manifest.webapp'})
      );
    });

    test('should be able to remove card within folder', function(done) {
      assert.ok(
        cardManager.findCardFromCardList({
          manifestURL: 'app://video.gaiamobile.org/manifest.webapp'})
      );

      cardManager.getCardList().then(function(cardList) {
        cardManager.removeCard(cardList[3].getCardList()[0]);

        assert.isUndefined(
          cardManager.findCardFromCardList({
            manifestURL: 'app://video.gaiamobile.org/manifest.webapp'})
        );
      }).then(done, done);
    });
  });

  suite('writeCardlistInCardStore()', function() {
    var cardManager;

    setup(function() {
      cardManager = new CardManager();
      // We bypass init() because it involves navigator.mozApps.mgmt
      // Instead we need to prepare necessary properties of cardManager
      cardManager._asyncSemaphore = new AsyncSemaphore();
      cardManager._cardStore = MockCardStore;

      cardManager._cardList = [
        decks.dashbaord,
        folders.emptyOne,
        folders.emptyTwo,
        apps.music
      ];

      cardManager.installedApps = {
        'app://dashboard.gaiamobile.org/manifest.webapp': {
          name: 'Dashboard',
          removable: false,
          manifest: {},
          manifestURL: 'app://dashboard.gaiamobile.org/manifest.webapp'
        },
        'app://music.gaiamobile.org/manifest.webapp': {
          name: 'Music',
          removable: false,
          manifest: {},
          manifestURL: 'app://music.gaiamobile.org/manifest.webapp'
        }
      };

    });

    teardown(function() {
      MockCardStore.mClearData();
      cardManager = undefined;
    });

    test('write with empty folder should eliminate it from card list',
      function(done) {
        var expectedLength = cardManager._cardList.length - 2;

        cardManager.writeCardlistInCardStore({
          cleanEmptyFolder: true
        }).then(function() {
          assert.equal(cardManager._cardList.length, expectedLength);
          assert.isTrue(cardManager._cardList.indexOf(folders.emptyOne) < 0);
        }).then(done, done);
      });
  });

  suite('swapCard()', function() {
    var cardManager;

    setup(function() {
      cardManager = prepareCardManagerForTesting();
    });

    teardown(function() {
      MockCardStore.mClearData();
      cardManager = undefined;
    });

    test('swap adjacent cards', function() {
      var card1 = cardManager._cardList[0];
      var card2 = cardManager._cardList[1];
      cardManager.swapCard(card1, card2);
      assert.equal(cardManager._cardList[0], card2);
      assert.equal(cardManager._cardList[1], card1);
    });

    test('swap non-adjacent cards', function() {
      var card1 = cardManager._cardList[0];
      var card2 = cardManager._cardList[2];
      cardManager.swapCard(card1, card2);
      assert.equal(cardManager._cardList[0], card2);
      assert.equal(cardManager._cardList[2], card1);
    });
  });

});
