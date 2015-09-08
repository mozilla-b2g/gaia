'use strict';

/* global BookmarkEditor, msgHandler, realMozSetMessageHandler, utils */
/* global requireApp, require, suite, suiteTeardown, suiteSetup, test, assert,
          MocksHelper, MockL10n */

require('/shared/test/unit/mocks/mock_l10n.js');

requireApp('bookmark/test/unit/mock_mozsetmessagehandler.js');
requireApp('bookmark/test/unit/mock_bookmark_editor.js');

requireApp('bookmark/js/components/status.js');
requireApp('bookmark/js/activity_handler.js');

var mocksHelperForSaveBookmark = new MocksHelper([
  'BookmarkEditor'
]);

mocksHelperForSaveBookmark.init();

suite('activity_handler.js >', function() {

  mocksHelperForSaveBookmark.attachTestHelpers();
  var realMozL10n;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    navigator.mozL10n = realMozL10n;
    msgHandler.activity = null;
  });

  function createSource(name, type) {
    return {
      name: name,
      data: {
        type: type
      }
    };
  }

  suite('Initialization >', function() {
    test('Bookmark app is listening right now ', function() {
      // The handler was defined
      assert.isFunction(msgHandler.activity);
      // The handler defines a parameter -> the activity
      assert.equal(msgHandler.activity.length, 1);
    });
  });

  suite('Adding and updating bookmarks >', function() {
    suiteSetup(function() {
      utils.status.init();
      // We change the duration of the status in order to avoid timeout
      utils.status.setDuration(400);
    });

    suiteTeardown(function() {
      utils.status.destroy();
    });

    test('The new bookmark has been added correctly ', function(done) {
      msgHandler.activity({
        source: createSource('save-bookmark', 'url'),
        postResult: function(result) {
          assert.equal(result, 'saved');
          done();
        }
      });

      // The user clicks on <save> button
      BookmarkEditor.save(true);
    });

    test('The bookmark already exists and it is updated ', function(done) {
      msgHandler.activity({
        source: createSource('save-bookmark', 'url'),
        postResult: function(result) {
          assert.equal(result, 'updated');
          done();
        }
      });

      // The user clicks on <save> button
      BookmarkEditor.save();
    });

    test('Bookmarking failed - request cancelled by user ', function(done) {
      msgHandler.activity({
        source: createSource('save-bookmark', 'url'),
        postError: function(result) {
          assert.equal(result, 'cancelled');
          done();
        }
      });

      // The user cancels the request
      BookmarkEditor.cancel();
    });

    test('The status is displayed when a bookmark has been added correctly ',
       function(done) {
      msgHandler.activity({
        source: createSource('save-bookmark', 'url'),
        postResult: function() { }
      });

      window.addEventListener('status-showed', function showed() {
        window.removeEventListener('status-showed', showed);
        assert.isTrue(document.querySelector('[role="status"] p').textContent.
                                                                    length > 0);
      });

      window.addEventListener('status-hidden', function hidden() {
        window.removeEventListener('status-hidden', hidden);
        done();
      });

      BookmarkEditor.save(true);
    });
  });

  suite('Common errors >', function() {
    test('Name not supported ', function(done) {
      // "save-watermelon" activities are not supported
      msgHandler.activity({
        source: createSource('save-watermelon', 'url'),
        postError: function(result) {
          assert.equal(result, 'name not supported');
          done();
        }
      });
    });

    test('Type not supported for save-bookmark', function(done) {
      // We don't support the type "cherry"
      msgHandler.activity({
        source: createSource('save-bookmark', 'cherry'),
        postError: function(result) {
          assert.equal(result, 'type not supported');
          done();
        }
      });
    });
  });

});
