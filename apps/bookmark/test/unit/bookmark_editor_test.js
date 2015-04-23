'use strict';

/* global loadBodyHTML, BookmarkEditor, BookmarksDatabase, Icon */
/* global requireApp, require, suite, suiteTeardown, suiteSetup, test, assert,
          sinon, MockWebManifestHelper */

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('sharedtest/test/unit/mock_web_manifest_helper.js');

require('/shared/js/homescreens/icon.js');
requireApp('bookmark/js/bookmark_editor.js');
require('/shared/js/bookmarks_database.js');
require('/shared/js/url_helper.js');

suite('bookmark_editor.js >', function() {

  var getStub, iconRenderStub, realL10n,
  realWebManifestHelper;

  var name = 'Mozilla';
  var url = 'http://www.mozilla.org/es-ES/firefox/new/';

  var bookmark = {
    name: name,
    url: url
  };

  var databaseInError = false;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;
    loadBodyHTML('/save.html');
    getStub = sinon.stub(BookmarksDatabase, 'get', function(purl) {
      return {
        then: function(resolve, refect) {
          databaseInError ? refect() : resolve (purl === url ? bookmark : null);
        }
      };
    });
    iconRenderStub = sinon.stub(Icon.prototype, 'render', function() {});
    realWebManifestHelper = window.WebManifestHelper;
    window.WebManifestHelper = MockWebManifestHelper;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    databaseInError = false;
    getStub.restore();
    iconRenderStub.restore();
    window.WebManifestHelper = realWebManifestHelper;
  });

  function noop() {
    // Do nothing
  }

  function dispatchInputEvent() {
    BookmarkEditor.form.dispatchEvent(new CustomEvent('input'));
  }

  suite('Add UI initialized correctly >', function() {
    var expectedName = 'Telefonica';

    suiteSetup(function() {
      BookmarkEditor.init({
        data: {
          name: expectedName
        },
        oncancelled: noop
      });
    });

    test('The title has to be defined from options.data.name >', function() {
      assert.equal(document.getElementById('bookmark-title').value,
                   expectedName);
    });

    test('Checking styles', function() {
      assert.equal(document.body.dataset.mode, 'add');
    });
  });

  suite('Edit UI initialized correctly >', function() {
    suiteSetup(function() {
      BookmarkEditor.init({
        data: bookmark,
        oncancelled: noop
      });
    });

    test('The title has to be defined from datastore >', function() {
      assert.equal(document.getElementById('bookmark-title').value, name);
    });

    test('Checking styles', function() {
      assert.equal(document.body.dataset.mode, 'put');
    });

    test('Checking "done" button after writing', function() {
      document.getElementById('bookmark-form').
               dispatchEvent(new CustomEvent('input'));
      assert.isFalse(BookmarkEditor.saveButton.disabled);
    });
  });

  suite('UI initialized correctly as "add" when database fails >', function() {
    var expectedName = 'Telefonica';
    var expectedURL = 'www.telefonica.es';

    suiteSetup(function() {
      databaseInError = false;
      BookmarkEditor.init({
        data: {
          name: expectedName,
          url: expectedURL
        },
        oncancelled: noop
      });
    });

    test('The title has to be defined from options.data.name >', function() {
      assert.equal(document.getElementById('bookmark-title').value,
                   expectedName);
    });

    test('Checking styles', function() {
      assert.equal(document.body.dataset.mode, 'add');
    });

    test('Checking "add" button initially', function() {
      assert.isFalse(BookmarkEditor.saveButton.disabled);
    });
  });

  suite('Invalid website name >', function() {

    suiteSetup(function() {
      BookmarkEditor.init({
        data: {
          name: '',
          url: url
        },
        oncancelled: noop
      });
    });

    test('Bookmarks with blank title should not be saved >', function() {
      assert.isTrue(BookmarkEditor.saveButton.disabled,
                'Blank title, add button should be disabled');
    });

    test('Check save button typing website name ', function() {
      BookmarkEditor.bookmarkTitle.value = 'Telefonica';
      dispatchInputEvent();
      assert.isFalse(BookmarkEditor.saveButton.disabled);

      BookmarkEditor.bookmarkTitle.value = '';
      dispatchInputEvent();
      assert.isTrue(BookmarkEditor.saveButton.disabled);

      BookmarkEditor.bookmarkTitle.value = 'Mozilla';
      dispatchInputEvent();
      assert.isFalse(BookmarkEditor.saveButton.disabled);
    });

  });

  suite('Install App >', function() {
    suiteSetup(function() {
      BookmarkEditor.init({
        data: {
          name: 'My App',
          url: 'http://example.com'
        },
        oncancelled: noop
      });
    });

    test('_fetchManifest()', function(done) {
      var stubRenderAppIcon = sinon.stub(BookmarkEditor, '_renderAppIcon',
        function(manifest, manifestURL, size) {}
      );
      BookmarkEditor._fetchManifest().then(
      function () {
          assert.isFalse(
            BookmarkEditor.appInstallationSection.classList.contains(
              'hidden'));
          assert.equal(BookmarkEditor.appNameText.textContent, 'App');
          done();
          stubRenderAppIcon.restore();
      },
      function (err) {
        done(err);
        console.error(err);
      });
    });

    test('_renderAppIcon()', function() {
      BookmarkEditor._renderAppIcon({}, 'http://example.com/manifest.json', 60);
      assert.equal(BookmarkEditor.appIcon.getAttribute('src'),
        'http://example.com/icon.png');
    });
  });

});
