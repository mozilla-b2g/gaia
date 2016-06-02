/*global ActivityClient,
         ActivityHandler,
         App,
         Attachment,
         Drafts,
         MessageManager,
         MocksHelper,
         Navigation,
         Settings,
         Utils
*/

'use strict';

require('/views/shared/test/unit/mock_attachment.js');
require('/services/test/unit/mock_message_manager.js');
require('/services/test/unit/activity/mock_activity_shim.js');
require('/services/test/unit/activity/mock_activity_client.js');
require('/views/shared/test/unit/mock_app.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_navigation.js');
require('/services/test/unit/mock_drafts.js');

require('/views/shared/js/utils.js');
require('/views/shared/test/unit/mock_utils.js');

require('/views/shared/js/activity_handler.js');

var mocksHelperForActivityHandler = new MocksHelper([
  'ActivityClient',
  'ActivityShim',
  'App',
  'Attachment',
  'Draft',
  'Drafts',
  'MessageManager',
  'Navigation',
  'Settings',
  'Utils'
]).init();

suite('ActivityHandler', function() {
  mocksHelperForActivityHandler.attachTestHelpers();

  setup(function() {
    this.sinon.stub(Utils, 'onceDocumentIsVisible').returns(Promise.resolve());
    this.sinon.stub(Utils, 'alert').returns(Promise.resolve());

    this.sinon.stub(ActivityClient);
  });

  test('init()', function() {
    ActivityHandler.init();

    sinon.assert.calledOnce(ActivityClient.init);
    sinon.assert.calledWith(ActivityClient.init, App.instanceId);

    sinon.assert.calledWith(ActivityClient.on, 'new-activity-request');
    sinon.assert.calledWith(ActivityClient.on, 'share-activity-request');
  });

  suite('"share" activity', function() {
    var activityData;

    function onceShareActivityCompleted() {
      sinon.assert.called(ActivityHandler._onShareActivity);
      return ActivityHandler._onShareActivity.lastCall.returnValue;
    }

    setup(function() {
      this.sinon.spy(ActivityHandler, '_onShareActivity');
      this.sinon.spy(Navigation, 'toPanel');
      this.sinon.spy(Drafts, 'add');
      this.sinon.spy(Drafts, 'store');
      this.sinon.spy(Drafts, 'request');

      activityData = {
        type: 'video/*',
        blobs: [
          new Blob(['test'], { type: 'video/x-video' }),
          new Blob(['test2'], { type: 'video/x-video' }),
          new Blob(),
          new Blob(),
          new Blob()
        ],
        filenames: [
          'testBlob1', 'testBlob2', 'testBlob3', 'testBlob4', 'testBlob5'
        ]
      };

      ActivityHandler.init();
    });

    test('moves to the composer panel after saving draft', function(done) {
      ActivityClient.on.withArgs('share-activity-request').yield(
        activityData
      );

      onceShareActivityCompleted().then(() => {
        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: null,
          type: 'mms',
          content: [
            sinon.match.instanceOf(Attachment),
            sinon.match.instanceOf(Attachment),
            sinon.match.instanceOf(Attachment),
            sinon.match.instanceOf(Attachment),
            sinon.match.instanceOf(Attachment)
          ]
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer',
          { draftId: 'draftId', focus: sinon.match.falsy }
        );
      }).then(done, done);
    });

    test('Attachment size over max mms should not be appended', function(done) {
      // Adjust mmsSizeLimitation for verifying alert popup when size over
      // limitation.
      Settings.mmsSizeLimitation = 1;

      ActivityClient.on.withArgs('share-activity-request').yield(
        activityData
      );

      sinon.assert.calledWith(Utils.alert, {
        id: 'attached-files-too-large',
        args: { n: 5, mmsSize: '0' }
      });

      Utils.alert.lastCall.returnValue.then(() => {
        sinon.assert.calledWithExactly(ActivityClient.postResult);
        sinon.assert.notCalled(Navigation.toPanel);
      }).then(done, done);
    });

    test('Should append images even when they are big', function(done) {
      activityData.blobs = [new Blob(['test'], { type: 'image/jpeg' })];

      Settings.mmsSizeLimitation = 1;

      ActivityClient.on.withArgs('share-activity-request').yield(
        activityData
      );

      sinon.assert.notCalled(Utils.alert);

      onceShareActivityCompleted().then(() => {
        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: null,
          type: 'mms',
          content: [sinon.match.instanceOf(Attachment)]
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer',
          { draftId: 'draftId', focus: sinon.match.falsy }
        );
      }).then(done, done);
    });

    test('Should append vcard attachment', function(done) {
      activityData.blobs = [new Blob(['test'], { type: 'text/x-vcard' })];

      ActivityClient.on.withArgs('share-activity-request').yield(
        activityData
      );

      sinon.assert.notCalled(Utils.alert);

      onceShareActivityCompleted().then(() => {
        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: null,
          type: 'mms',
          content: [sinon.match.instanceOf(Attachment)]
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer',
          { draftId: 'draftId', focus: sinon.match.falsy }
        );
      }).then(done, done);
    });

    test('Appends URL to the Compose field for activity with URL data type',
    function(done) {
      var urlActivityData = {
        type: 'url',
        url: 'test_url'
      };

      ActivityClient.on.withArgs('share-activity-request').yield(
        urlActivityData
      );

      sinon.assert.notCalled(Utils.alert);

      onceShareActivityCompleted().then(() => {
        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: null,
          type: 'sms',
          content: [urlActivityData.url]
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer',
          { draftId: 'draftId', focus: sinon.match.falsy }
        );
      }).then(done, done);
    });

    test('Call activity postError if no data to share', function() {
      ActivityClient.on.withArgs('share-activity-request').yield({
        type: 'url'
      });

      sinon.assert.notCalled(Navigation.toPanel);
      sinon.assert.notCalled(ActivityClient.postResult);
      sinon.assert.calledOnce(ActivityClient.postError);
      sinon.assert.calledWith(
        ActivityClient.postError, 'No data to share found!'
      );
    });

    test('Call activity postError on unknown activity data type', function() {
      ActivityClient.on.withArgs('share-activity-request').yield({
        type: 'multipart/mixed'
      });

      sinon.assert.notCalled(Navigation.toPanel);
      sinon.assert.notCalled(ActivityClient.postResult);
      sinon.assert.calledOnce(ActivityClient.postError);
      sinon.assert.calledWith(
        ActivityClient.postError,
        'Unsupported activity data type: multipart/mixed'
      );
    });
  });

  suite('"new" activity', function() {
    var emailActivityData;

    function onceNewActivityCompleted() {
      sinon.assert.called(ActivityHandler._onNewActivity);
      return ActivityHandler._onNewActivity.lastCall.returnValue;
    }

    function assertDraftSaved(draft) {
      sinon.assert.calledWithMatch(Drafts.add, draft);
      sinon.assert.called(Drafts.store);
      sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
    }

    var threadDeferred;

    setup(function() {
      emailActivityData = {
        target: 'abc@exmple.com',
        body: 'foo'
      };

      // configure findThreadFromNumber
      threadDeferred = Utils.Promise.defer();
      this.sinon.stub(MessageManager, 'findThreadFromNumber').returns(
        threadDeferred.promise
      );
      this.sinon.spy(Navigation, 'toPanel');
      this.sinon.spy(Drafts, 'add');
      this.sinon.spy(Drafts, 'store');
      this.sinon.spy(Drafts, 'request');
      this.sinon.spy(ActivityHandler, '_onNewActivity');

      ActivityHandler.init();
    });

    test('Non-existing thread, with number and body', function(done) {
      ActivityClient.on.withArgs('new-activity-request').yield({
        number: '123',
        body: 'foo'
      });

      // This should not be used but keeping it here to have a consistent
      // environment for this test case.
      threadDeferred.reject(new Error('No thread for this test'));

      onceNewActivityCompleted().then(function() {
        sinon.assert.notCalled(MessageManager.findThreadFromNumber);

        assertDraftSaved({
          recipients: ['123'],
          type: 'sms',
          content: ['foo']
        });
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer',
          { draftId: 'draftId', focus: 'composer' }
        );
      }).then(done,done);
    });

    test('existing thread with specified body, navigate to composer',
    function(done) {
      ActivityClient.on.withArgs('new-activity-request').yield({
        number: '123',
        body: 'foo'
      });

      // This should not be used but keeping it here to have a consistent
      // environment for this test case.
      threadDeferred.resolve(42);

      onceNewActivityCompleted().then(function() {
        sinon.assert.notCalled(MessageManager.findThreadFromNumber);

        assertDraftSaved({
          recipients: ['123'],
          type: 'sms',
          content: ['foo']
        });

        sinon.assert.calledWithMatch(
          Navigation.toPanel,
          'composer', { draftId: 'draftId' }
        );
      }).then(done,done);
    });

    test('new message with body only', function(done) {
      ActivityClient.on.withArgs('new-activity-request').yield(
        { body: 'foo' }
      );

      onceNewActivityCompleted().then(() => {
        sinon.assert.notCalled(MessageManager.findThreadFromNumber);

        assertDraftSaved({
          recipients: null,
          type: 'sms',
          content: ['foo']
        });
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer',
          { draftId: 'draftId', focus: sinon.match.falsy }
        );
      }).then(done,done);
    });

    test('Non-existing thread with recipient only, navigate to composer',
    function(done) {
      ActivityClient.on.withArgs('new-activity-request').yield({
        number: '123'
      });

      threadDeferred.reject(new Error('No thread for this test'));

      onceNewActivityCompleted().then(function() {
        sinon.assert.calledWith(MessageManager.findThreadFromNumber, '123');
        assertDraftSaved({
          recipients: ['123'],
          type: 'sms',
          content: null
        });
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer',
          { draftId: 'draftId', focus: 'composer' }
        );
      }).then(done,done);
    });

    test('new message with email and body', function(done) {
      ActivityClient.on.withArgs('new-activity-request').yield(
        emailActivityData
      );

      // This is not used but it's kept here for consistency.
      threadDeferred.reject(new Error('No thread for this test'));

      onceNewActivityCompleted().then(function() {
        sinon.assert.notCalled(MessageManager.findThreadFromNumber);

        assertDraftSaved({
          recipients: [emailActivityData.target],
          type: 'mms',
          content: [emailActivityData.body]
        });
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer',
          { draftId: 'draftId', focus: 'composer' }
        );
      }).then(done,done);
    });

    test('existing thread with recipient only, navigate to the thread',
    function(done) {
      ActivityClient.on.withArgs('new-activity-request').yield({
        number: '123'
      });

      // this time we can find a thread with id=42
      threadDeferred.resolve(42);

      onceNewActivityCompleted().then(function() {
        sinon.assert.calledWithMatch(
          Navigation.toPanel, 'thread', { id: 42, focus: 'composer' }
        );
      }).then(done,done);
    });
  });
});
