'use strict';
/* global BaseCollection */
/* global HandleView */
/* global Promise */
/* global MocksHelper */

require('/js/objects.js');
require('/test/unit/mock_contextmenu.js');
require('/test/unit/mock_view_apps.js');
require('/test/unit/mock_view_bg.js');
require('/test/unit/mock_view_editmode.js');
require('/shared/js/l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');

var mocksForCollection = new MocksHelper([
  'Contextmenu',
  'ViewApps',
  'ViewBgImage',
  'ViewEditMode'
]).init();

suite('view > ', function() {
  mocksForCollection.attachTestHelpers();

  var subject;
  var realSetMessageHandler;

  setup(function(done) {
    loadBodyHTML('/view.html');

    var fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));

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
