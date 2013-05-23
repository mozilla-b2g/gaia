'use strict';

requireApp('homescreen/test/unit/mock_mozsetmessagehandler.js');
requireApp('homescreen/test/unit/mock_bookmark_editor.js');

requireApp('homescreen/js/save-bookmark.js');

var mocksHelperForSaveBookmark = new MocksHelper([
  'BookmarkEditor'
]);

mocksHelperForSaveBookmark.init();

suite('save-bookmark.js >', function() {

  suiteSetup(function() {
    mocksHelperForSaveBookmark.suiteSetup();
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    msgHandler = null;

    mocksHelperForSaveBookmark.suiteTeardown();
  });

  function createSource(name, type) {
    return {
      name: name,
      data: {
        type: type
      }
    };
  }

  test('Homescreen is listening right now ', function() {
    // The handler was defined
    assert.isFunction(msgHandler);
    // The handler defines a parameter -> the activity
    assert.equal(msgHandler.length, 1);
  });

  test('The new bookmark has been added correctly ', function(done) {
    msgHandler({
      source: createSource('save-bookmark', 'url'),
      postResult: function(result) {
        assert.equal(result, 'saved');
        done();
      }
    });

    // The user clicks on <save> button
    BookmarkEditor.save();
  });

  test('Bookmarking failed - request cancelled by user ', function(done) {
    msgHandler({
      source: createSource('save-bookmark', 'url'),
      postError: function(result) {
        assert.equal(result, 'cancelled');
        done();
      }
    });

    // The user cancels the request
    BookmarkEditor.cancel();
  });

  test('Bookmarking failed - error name not supported ', function(done) {
    // "save-watermelon" activities are not supported
    msgHandler({
      source: createSource('save-watermelon', 'url'),
      postError: function(result) {
        assert.equal(result, 'name not supported');
        done();
      }
    });
  });

  test('Bookmarking failed - error type not supported ', function(done) {
    // We don't support the type "cherry"
    msgHandler({
      source: createSource('save-bookmark', 'cherry'),
      postError: function(result) {
        assert.equal(result, 'type not supported');
        done();
      }
    });
  });

});
