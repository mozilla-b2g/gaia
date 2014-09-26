'use strict';

/* global Promise */

require('/js/common.js');
require('/js/objects.js');
require('/js/collection_icon.js');
require('/shared/test/unit/mocks/mock_collections_database.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');

var mocksForCollection = new MocksHelper(['CollectionsDatabase']).init();

suite('create', function() {
  mocksForCollection.attachTestHelpers();

  var realSetMessageHandler;
  var realL10n;

  var activity = {
    source: {
      name: 'create-collection',
      data: {
        maxIconSize: 60
      }
    },
    postResult: () => {}
  };

  var mockL10n = {
    get: key => key
  };

  var mockEme = {
    init: () => Promise.resolve(),
    log: console.log.bind(console),
    api: {
      Categories: {
        list: function() {}
      }
    }
  };

  var mockSuggestions = {
    load: (categories) => Promise.resolve([categories[0].categoryId])
  };

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = mockL10n;

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = window.MockNavigatormozSetMessageHandler;
    navigator.mozSetMessageHandler.mSetup();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozSetMessageHandler = realSetMessageHandler;
  });

  setup(function(done) {
    loadBodyHTML('/create.html');

    window.eme = mockEme;
    window.Suggestions = mockSuggestions;

    require('/js/create_collection.js', function() {
      done();
    });
  });

  test('alerts a network error message when offline', function(done) {
    var alertStub = this.sinon.stub(window, 'alert');
    this.sinon.stub(mockEme.api.Categories, 'list')
      .returns(Promise.reject('network error'));

    window.HandleCreate(activity).then(() => {
      assert.isTrue(alertStub.calledOnce);
      done();
    });
  });
});
