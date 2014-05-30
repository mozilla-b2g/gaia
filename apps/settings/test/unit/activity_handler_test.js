/* global ActivityHandler */
'use strict';

require('/js/activity_handler.js');
mocha.globals(['ActivityHandler']);

suite('ActivityHandler', function() {
  var originalMozHasPendingMessage;
  var originalMozSetMessageHandler;

  setup(function() {
    originalMozHasPendingMessage = navigator.mozHasPendingMessage;
    originalMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozHasPendingMessage = function() {};
    navigator.mozSetMessageHandler = function() {};
  });

  teardown(function() {
    navigator.mozHasPendingMessage = originalMozHasPendingMessage;
    navigator.mozSetMessageHandler = originalMozSetMessageHandler;

    ActivityHandler._targetPanel = null;
    ActivityHandler._currentActivity = null;
  });

  suite('ready', function() {
    var sandbox = sinon.sandbox.create();

    test('when no callback passed in', function() {
      sandbox.spy(navigator, 'mozHasPendingMessage');
      sandbox.spy(navigator, 'mozSetMessageHandler');

      ActivityHandler.ready();
      assert.ok(!navigator.mozHasPendingMessage.called,
        'mozHasPendingMessage should not be called');
      assert.ok(!navigator.mozSetMessageHandler.called,
        'mozSetMessageHandler should not be called');

      sandbox.restore();
    });

    test('has no pending messages', function() {
      var callbackSpy = sinon.spy();
      sandbox.stub(navigator, 'mozHasPendingMessage').returns(false);
      sandbox.spy(navigator, 'mozSetMessageHandler');

      ActivityHandler.ready(callbackSpy);
      assert.ok(!navigator.mozSetMessageHandler.called,
        'mozSetMessageHandler should not be called');
      assert.ok(callbackSpy.called, 'callback should be called');

      sandbox.restore();
    });

    test('has pending messages', function() {
      var mockSectionId = 'mockSection';
      var mockActivity = {
        source: {
          data: {
            section: mockSectionId
          }
        }
      };
      var callbackSpy = sinon.spy();

      sandbox.stub(navigator, 'mozHasPendingMessage').returns(true);
      sandbox.stub(navigator, 'mozSetMessageHandler', function(name, callback) {
        callback(mockActivity);
      });
      sandbox.stub(ActivityHandler, '_handle', function() {
        return mockSectionId;
      });
      sandbox.stub(ActivityHandler, '_registerListener');

      ActivityHandler.ready(callbackSpy);
      assert.ok(ActivityHandler.currentActivity === mockActivity,
        'currentActivity should be set correctly');
      assert.ok(ActivityHandler.targetPanelId === mockSectionId,
        'targetPanelId should be set correctly');
      assert.ok(navigator.mozSetMessageHandler.called,
        'mozSetMessageHandler should be called');
      assert.ok(ActivityHandler._handle.calledWith(mockActivity.source),
        '_handle should be called');
      assert.ok(ActivityHandler._registerListener.called,
        '_registerListener should be called');
      assert.ok(callbackSpy.called, 'callback should be called');

      sandbox.restore();
    });
  });

  suite('_handlers', function() {
    suite('configure', function() {
      var handler;
      var mockSectionId = 'mockSection';
      var mockSection;

      setup(function() {
        handler = ActivityHandler._handlers.configure;
        mockSection = document.createElement('section');
        mockSection.id = mockSectionId;
        document.body.appendChild(mockSection);
      });

      teardown(function() {
        document.body.innerHTML = '';
      });

      test('without section specified', function() {
        var targetPanelId = handler({
          data: {
            section: null
          }
        });
        assert.ok(targetPanelId === 'root', 'should return "root"');
      });

      test('with section other than root specified', function() {
        var targetPanelId = handler({
          data: {
            section: mockSectionId
          }
        });
        assert.ok(targetPanelId === mockSectionId,
          'should return the specified section id');
        assert.ok(mockSection.dataset.dialog, 'the dialog mode should be set');
      });

      test('with root specified but without filter by', function() {
        var rootSection = document.createElement('section');
        rootSection.id = 'root';
        document.body.appendChild(rootSection);

        var targetPanelId = handler({
          data: {
            section: 'root'
          }
        });
        assert.ok(targetPanelId === 'root', 'should "return root"');
        assert.ok(document.body.dataset.filterBy === 'all',
          'body.filterBy should be set');
      });

      test('with root specified and with filter by', function() {
        var targetPanelId = handler({
          data: {
            section: 'root',
            filterBy: 'connectivity'
          }
        });
        assert.ok(targetPanelId === 'root', 'should "return root"');
        assert.ok(document.body.dataset.filterBy === 'connectivity',
          'body.filterBy should be set');
      });

      test('with invalid section id specified', function() {
        var rootSection = document.createElement('section');
        rootSection.id = 'root';
        document.body.appendChild(rootSection);

        var targetPanelId = handler({
          data: {
            section: 'invalid'
          }
        });
        assert.ok(targetPanelId === 'root', 'should "return root"');
        assert.ok(document.body.dataset.filterBy === 'all',
          'body.filterBy should be set');
      });

      test('with valid section id but invalid section element', function() {
        var invalidSection = document.createElement('div');
        invalidSection.id = 'valid';
        document.body.appendChild(invalidSection);

        var targetPanelId = handler({
          data: {
            section: 'valid'
          }
        });
        assert.ok(targetPanelId === 'root', 'should "return root"');
        assert.ok(document.body.dataset.filterBy === 'all',
          'body.filterBy should be set');
      });
    });
  });
});
