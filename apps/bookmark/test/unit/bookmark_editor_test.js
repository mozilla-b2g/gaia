'use strict';

/* global loadBodyHTML, BookmarkEditor, BookmarksDatabase, Icon */
/* global requireApp, require, suite, suiteTeardown, suiteSetup, test, assert,
          sinon */

require('/shared/test/unit/load_body_html_helper.js');

requireApp('bookmark/js/icon.js');
requireApp('bookmark/js/bookmark_editor.js');
require('/shared/js/bookmarks_database.js');
require('/shared/js/url_helper.js');

suite('bookmark_editor.js >', function() {

  var getStub, iconRenderStub;

  var name = 'Mozilla';
  var url = 'http://www.mozilla.org/es-ES/firefox/new/';

  var bookmark = {
    name: name,
    url: url
  };

  var databaseInError = false;

  suiteSetup(function() {
    loadBodyHTML('/save.html');
    getStub = sinon.stub(BookmarksDatabase, 'get', function(purl) {
      return {
        then: function(resolve, refect) {
          databaseInError ? refect() : resolve (purl === url ? bookmark : null);
        }
      };
    });
    iconRenderStub = sinon.stub(Icon.prototype, 'render', function() {});
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
    databaseInError = false;
    getStub.restore();
    iconRenderStub.restore();
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

});
