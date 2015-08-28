'use strict';

/* global loadBodyHTML, BookmarkEditor, BookmarksDatabase */
/* global requireApp, require, suite, suiteTeardown, suiteSetup, test, assert,
          MocksHelper, setup, sinon */

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_web_manifest_helper.js');

require('/shared/test/unit/mocks/mock_icons_helper.js');
requireApp('bookmark/js/bookmark_editor.js');
require('/shared/js/bookmarks_database.js');
require('/shared/js/url_helper.js');
require('/shared/js/component_utils.js');
require('/shared/elements/gaia_pin_card/script.js');

var mocksForBookmarkEditor = new MocksHelper([
  'IconsHelper', 'WebManifestHelper'
]).init();

var url = 'http://www.mozilla.org/es-ES/firefox/new/';

suite('bookmark_editor.js >', function() {

  var realL10n, getStub;
  mocksForBookmarkEditor.attachTestHelpers();

  var databaseInError = false;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;
    loadBodyHTML('/save.html');
    getStub = sinon.stub(BookmarksDatabase, 'get', function() {
      return {
        then: function(resolve, refect) {
          databaseInError ? refect() : resolve ();
        }
      };
    });

  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    databaseInError = false;
    getStub.restore();
  });

  suite('Initialization', function() {

    setup(function() {
      this.sinon.stub(BookmarkEditor, '_renderPinCard');
      this.sinon.stub(BookmarkEditor, 'save');
      this.sinon.stub(BookmarkEditor, 'close');
      BookmarkEditor.init({
        data: {
          url: url
        }
      });
    });

    test('registers DOM elements', function() {
      assert.ok(BookmarkEditor.pinURL);
      assert.ok(BookmarkEditor.pinCardContainer);
      assert.ok(BookmarkEditor.header);
      assert.ok(BookmarkEditor.pinButton);
      assert.equal(BookmarkEditor.pinURL.textContent, url);
    });

    test('adds pinButton listener', function() {
      BookmarkEditor.pinButton.dispatchEvent(new CustomEvent('click'));
      assert(BookmarkEditor.save.called);
    });

    test('adds cancel listener', function() {
      BookmarkEditor.header.dispatchEvent(new CustomEvent('action'));
      assert(BookmarkEditor.close.called);
    });

    test('renders the pin card', function() {
      assert.isTrue(BookmarkEditor._renderPinCard.called);
    });
  });

  suite('close', function() {
    var oncancelled;

    setup(function() {
      oncancelled = this.sinon.stub();
      BookmarkEditor.init({
        data: {},
        oncancelled: oncancelled
      });
    });

    test('calls oncancelled', function() {
      BookmarkEditor.close();
      assert.isTrue(oncancelled.called);
    });
  });

  suite('save', function() {
    var onsaved, store, place, data, sucessSaving,
        savedPlace, savedUrl, oncancelled;

    setup(function() {
      place = {};
      sucessSaving = true;
      store = {
        get: this.sinon.stub().returns({
          then: function(callback) {
            callback(place);
          }
        }),
        put: function() {}
      };

      this.sinon.stub(store, 'put', function(place, url) {
        savedPlace = place;
        savedUrl = url;
        return {
          then: function(callback) {
            if (sucessSaving) {
              callback();
            }
            return {
              catch: function(error) {
                if (!sucessSaving) {
                  error();
                }
              }
            };
          }
        };
      });
      this.sinon.stub(BookmarkEditor, '_getPlacesStore').returns({
        then: function(callback) {
          callback(store);
        }
      });
      onsaved = this.sinon.stub();
      oncancelled = this.sinon.stub();
      data = {
        url: url,
        title: 'title',
        theme: 'black',
        screenshot: new Blob()
      };
      BookmarkEditor.init({
        data: data,
        onsaved: onsaved,
        oncancelled: oncancelled
      });
    });

    test('saves the pinned place', function() {
      BookmarkEditor.save();
      var expectedPlace = {
        pinned: true,
        themeColor: data.theme,
        screenshot: data.screenshot,
        title: data.title
      };
      assert.isTrue(store.put.called);
      assert.equal(savedUrl, data.url);
      assert.isTrue(savedPlace.pinned);
      assert.equal(savedPlace.themeColor, expectedPlace.themeColor);
      assert.equal(savedPlace.screenshot, expectedPlace.screenshot);
      assert.equal(savedPlace.title, expectedPlace.title);
    });

    test('calls onsaved', function() {
      BookmarkEditor.save();
      assert.isTrue(onsaved.called);
    });

    test('calls oncancelled if it fails to save', function() {
      sucessSaving = false;
      BookmarkEditor.save();
      assert.isFalse(onsaved.called);
      assert.isTrue(oncancelled.called);
    });
  });

  suite('_renderPinCard', function() {
    var data;

    setup(function() {
      data = {
        url: url
      };
    });

    test('with all fields', function() {
      data.title = 'title';
      data.icon = new Blob();
      data.screenshot = new Blob();
      data.theme = 'black';

      BookmarkEditor.init({
        data: data
      });
      var card = BookmarkEditor.card;
      assert.ok(card);
      assert.equal(card.title, data.title);
      assert.include(card.icon, 'blob:app://bookmark.gaiamobile.org');
      assert.include(card.background.src, 'blob:app://bookmark.gaiamobil');
      assert.equal(card.background.themeColor, data.theme);
      assert.ok(document.querySelector('gaia-pin-card'));
    });

    test('without screenshot', function() {
      data.title = 'title';
      data.icon = new Blob();
      data.theme = 'black';

      BookmarkEditor.init({
        data: data
      });
      var card = BookmarkEditor.card;
      assert.ok(card);
      assert.equal(card.title, data.title);
      assert.include(card.icon, 'blob:app://bookmark.gaiamobile.org');
      assert.equal(card.background.src, null);
      assert.equal(card.background.themeColor, data.theme);
      assert.ok(document.querySelector('gaia-pin-card'));
    });

    test('without theme', function() {
      data.title = 'title';
      data.icon = new Blob();
      data.screenshot = new Blob();

      BookmarkEditor.init({
        data: data
      });
      var card = BookmarkEditor.card;
      assert.ok(card);
      assert.equal(card.title, data.title);
      assert.include(card.icon, 'blob:app://bookmark.gaiamobile.org');
      assert.include(card.background.src, 'blob:app://bookmark.gaiamobil');
      assert.isUndefined(card.background.themeColor);
      assert.ok(document.querySelector('gaia-pin-card'));
    });
  });

});
