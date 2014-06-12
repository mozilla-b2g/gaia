'use strict';
/* global BaseCollection */
/* global HandleView */
/* global Promise */

require('/js/objects.js');
require('/shared/js/l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');

suite('view > ', function() {
  var subject;
  var realSetMessageHandler;

  setup(function(done) {
    loadBodyHTML('/view.html');

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = window.MockNavigatormozSetMessageHandler;
    navigator.mozSetMessageHandler.mSetup();

    // Stub eme api for now
    window.eme = {
      init: function() {
        return Promise.resolve();
      }
    };

    require('/js/view_collection.js', function() {
      subject = HandleView;
      done();
    });
  });

  teardown(function() {
    navigator.mozSetMessageHandler = realSetMessageHandler;
  });

  test('renders a collection', function(done) {

    var renderStub = this.sinon.stub(BaseCollection, 'create');

    navigator.mozSetMessageHandler.mTrigger('activity', {
      source: {
        name: 'view-collection',
        data: {
          query: 'foo'
        }
      }
    });

    setTimeout(function() {
      assert.ok(renderStub.calledOnce);
      done();
    });
  });

});
