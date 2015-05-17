/* global ActivityHandler */
'use strict';

require('/js/activity_handler.js');
mocha.globals(['ActivityHandler']);

suite('ActivityHandler', function() {
  var originalMozSetMessageHandler;
  var originalMozMobileConnections;

  suiteSetup(function() {
    originalMozSetMessageHandler = navigator.mozSetMessageHandler;
    originalMozMobileConnections = navigator.mozMobileConnections;
  });

  setup(function() {
    navigator.mozSetMessageHandler = function() {};
    navigator.mozMobileConnections = [{}, {}];
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = originalMozSetMessageHandler;
    navigator.mozMobileConnections = originalMozMobileConnections;
  });

  teardown(function() {
    ActivityHandler._readyPromise = null;
    ActivityHandler._targetPanel = null;
    ActivityHandler._currentActivity = null;
  });

  suite('ready', function() {
    test('has pending messages', function(done) {
      var mockSectionId = 'mockSection';
      var mockActivity = {
        source: {
          data: {
            section: mockSectionId
          }
        }
      };

      this.sinon.stub(navigator, 'mozSetMessageHandler',
        function(name, callback) {
          callback(mockActivity);
      });
      this.sinon.stub(ActivityHandler, '_handleActivity', function() {
        return { targetPanelId: mockSectionId };
      });
      this.sinon.stub(ActivityHandler, '_registerListener');

      ActivityHandler.ready().then(function() {
        assert.ok(navigator.mozSetMessageHandler.called,
          'mozSetMessageHandler should be called');
        assert.ok(ActivityHandler._handleActivity.calledWith(
          mockActivity.source), '_handleActivity should be called');
        assert.ok(ActivityHandler._registerListener.called,
          '_registerListener should be called');
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_handleActivity', function() {
    var mockSectionId = 'mockSection';

    setup(function() {
      this.sinon.stub(ActivityHandler._handlers, 'configure', function() {
        return { targetPanelId: mockSectionId };
      });
    });

    test('should call to corresponding handler and set _targetPanelId ' +
      'correctly', function() {
        var mockActivitySource = {
          name: 'configure'
        };
        ActivityHandler._handleActivity(mockActivitySource);
        assert.equal(ActivityHandler._targetPanelId, mockSectionId);
    });
  });

  suite('_handlers', function() {
    suite('configure', function() {
      var handler;
      var mockSectionId = 'mockSection';
      var mockOptions = { option: 'test' };
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
        var {targetPanelId} = handler({
          data: {
            section: null
          }
        });
        assert.ok(targetPanelId === 'root', 'should return "root"');
      });

      test('with section other than root specified', function() {
        var {targetPanelId} = handler({
          data: {
            section: mockSectionId
          }
        });
        assert.ok(targetPanelId === mockSectionId,
          'should return the specified section id');
        assert.ok(mockSection.dataset.dialog, 'the dialog mode should be set');
      });

      test('with section other than root and options specified', function() {
        var {targetPanelId, options} = handler({
          data: {
            section: mockSectionId,
            options: mockOptions
          }
        });
        assert.ok(targetPanelId === mockSectionId,
          'should return the specified section id');
        assert.ok(options === mockOptions,
          'should return the specified options');
        assert.ok(mockSection.dataset.dialog, 'the dialog mode should be set');
      });

      test('with root specified but without filter by', function() {
        var rootSection = document.createElement('section');
        rootSection.id = 'root';
        document.body.appendChild(rootSection);

        var {targetPanelId} = handler({
          data: {
            section: 'root'
          }
        });
        assert.ok(targetPanelId === 'root', 'should "return root"');
        assert.ok(document.body.dataset.filterBy === 'all',
          'body.filterBy should be set');
      });

      test('with root specified and with filter by', function() {
        var {targetPanelId} = handler({
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

        var {targetPanelId} = handler({
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

        var {targetPanelId} = handler({
          data: {
            section: 'valid'
          }
        });
        assert.ok(targetPanelId === 'root', 'should "return root"');
        assert.ok(document.body.dataset.filterBy === 'all',
          'body.filterBy should be set');
      });

      test('with mozMobileConnections.length = 1', function() {
        // we have to make it single sim !
        navigator.mozMobileConnections = [{}];

        var section = document.createElement('section');
        section.id = 'call';
        document.body.appendChild(section);

        var {targetPanelId} = handler({
          data: {
            section: 'call'
          }
        });

        assert.ok(targetPanelId === 'call', 'should "return call"');
      });

      test('with mozMobileConnections.length > 1', function() {
        var section = document.createElement('section');
        section.id = 'call';
        document.body.appendChild(section);

        var {targetPanelId} = handler({
          data: {
            section: 'call'
          }
        });

        assert.ok(targetPanelId === 'call-iccs', 'should "return call-iccs"');
      });
    });
  });
});
