'use strict';

mocha.globals(['LockScreenMediator', 'LockScreenWidgetFactory',
               'LockScreenRouter', 'LockScreenBasicWidget']);

requireApp('system/js/lockscreen/widgets/basic.js');

suite('system/lockscreen/widgets/LockScreenBasicWidget >', function() {
  var mockMediator,
      mockFactory,
      mockRouter,
      widget;

  setup(function() {
    mockFactory =
    mockRouter = function() {};
    mockMediator = function() {
      this.request = function(req) {
        if ('canvas' === req.type) {
          req.content.response();
        }
      };
      this.post = function() {};
    };
    widget = new window.LockScreenBasicWidget(new mockMediator());
  });

  teardown(function() {
  });

  suite('requests', function() {
    test('requestRegister', function() {
      var stubRequest = this.sinon.stub(widget.mediator, 'request');
      widget.requestRegister();
      assert.isTrue(stubRequest.calledWithMatch(sinon.match(function(req) {
        return 'register-widget' === req.type &&
               widget.configs.name === req.from;
      })),
      'the fired request is incorrect');
    });
    test('requestInvokeWidget', function() {
      var stubRequest = this.sinon.stub(widget.mediator, 'request');
      widget.requestInvokeWidget(widget.configs.name);
      assert.isTrue(stubRequest.calledWithMatch(sinon.match(function(req) {
        return 'invoke' === req.type &&
               'widget' === req.content.method &&
               widget.configs.name === req.content.detail.name;
      })),
      'the fired request is incorrect');
    });
    test('requestInvokeSecureApp', function() {
      var stubRequest = this.sinon.stub(widget.mediator, 'request'),
          fakeUrl = 'app://fake',
          fakeManifestUrl = 'app://fake/manifest.webapp';
      widget.requestInvokeSecureApp(fakeUrl, fakeManifestUrl);
      assert.isTrue(stubRequest.calledWithMatch(sinon.match(function(req) {
        return 'invoke' === req.type &&
               'secureapp' === req.content.method &&
                fakeUrl === req.content.detail.url &&
                fakeManifestUrl === req.content.detail.manifestUrl;
      })),
      'the fired request is incorrect');
    });
    test('requestInvokeActivity', function() {
      var stubRequest = this.sinon.stub(widget.mediator, 'request'),
          activityContent = {
            'name': 'fake',
            'data': {'type': 'fake'}
          };
      widget.requestInvokeActivity(
        activityContent,
        function() {},
        function() {});
      assert.isTrue(stubRequest.calledWithMatch(sinon.match(function(req) {
        return 'activity' === req.content.method &&
               'fake' === req.content.detail.content.name &&
               'fake' === req.content.detail.content.data.type;
      })),
      'the fired request is incorrect');
    });
    test('requestInvokeCanvas', function() {
      var stubRequest = this.sinon.stub(widget.mediator, 'request');
      widget.requestCanvas('id', 'lockscreen', function() {});
      assert.isTrue(stubRequest.calledWithMatch(sinon.match(function(req) {
        return 'canvas' === req.type &&
               'lockscreen' === req.content.selector;
      })),
      'the fired request is incorrect');
    });

    suite('functions', function() {
      test('can inherit it as a new widget', function() {
        var fakeWidgetName = 'LockScreenFakeWidget',
            FakeWidget = function(mediator) {
              window.LockScreenBasicWidget.call(this, mediator);
              this.configs.name = fakeWidgetName;
            },
            fakeWidget = new FakeWidget(widget.mediator);
        assert.isTrue(fakeWidget instanceof FakeWidget,
          'the new widget is not a child of the basic widget');
      });
    });
  });
});

