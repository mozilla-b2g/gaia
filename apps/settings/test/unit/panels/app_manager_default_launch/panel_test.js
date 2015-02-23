'use strict';

suite('App Manager :: Default Launch App Panel>', function() {
  var modules = [
    'panels/app_default_launch/panel'
  ];

  var map = {
    '*': {
      'modules/settings_panel': 'MockSettingsPanel',
      'panels/app_default_launch/app_default_launch': 'MockDefaultLaunch'
    }
  };

  function resetHTML() {
    document.body.innerHTML = '';
    document.body.innerHTML = '<ul class="default-list"></ul>';
  }

  setup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    // Define MockSettingsPanel
    define('MockSettingsPanel', function() {
      return function(options) {
        return {
          init: options.onInit,
          beforeShow: options.onBeforeShow,
          show: options.onShow
        };
      };
    });

    // Define MockDefaultLaunch
    this.mockDefaultLaunch = {
      _list: [],
      init: function (root) {
      },
      getAll: function () {
        return Promise.resolve(this._list);
      },
      getAppName: function (manifestURL) {
        return Promise.resolve('manifest-name');
      }
    };
    define('MockDefaultLaunch', function() {
      return function () {
        return that.mockDefaultLaunch;
      };
    });

    requireCtx(modules, function(DefaultLaunchPanel) {
      that.panel = DefaultLaunchPanel();
      done();
    });

    resetHTML();
  });

  test('> get data before showing >', function() {
    this.sinon.spy(this.mockDefaultLaunch, 'getAll');
    this.panel.init(document.body);
    this.panel.beforeShow();

    assert.isTrue(this.mockDefaultLaunch.getAll.calledOnce);
  });

  suite('> render list', function() {
    var _listDOM;
    setup(function() {
      resetHTML();
      _listDOM = document.querySelector('.default-list');
      this.panel.init(document.body);
    });

    test('> list is created', function() {
      assert.isNotNull(_listDOM);
    });

    test('> empty list should show message', function() {
      this.mockDefaultLaunch._list = [];
      this.panel.beforeShow();
      this.panel.show();

      var message = _listDOM.querySelector('.empty-list');
      assert.equal(message.getAttribute('data-l10n-id'),
                   'appManager-defaultLaunch-empty');
    });

    test('> should render all list member', function(done) {
      this.mockDefaultLaunch._list = [
      {
        'name': 'action1',
        'activity': {
          'l10nId': 'action1-name'
        },
        'manifestURL': 'app://manifest1.gaiamobile.org/manifest.webapp'
      },
      {
        'name': 'action2',
        'activity': {
          'l10nId': 'action2-name'
        },
        'manifestURL': 'app://manifest2.gaiamobile.org/manifest.webapp'
      },
      {
        'name': 'action3',
        'activity': {
          'l10nId': 'action3-name'
        },
        'manifestURL': 'app://manifest3.gaiamobile.org/manifest.webapp'
      }];

      this.panel.beforeShow().then(this.panel.show).then(function() {
        var renderedList = _listDOM.querySelectorAll('li');
        assert.equal(renderedList.length, 3, '3 elements rendered');

        // check content of item1
        var item1 = renderedList[0];
        assert.equal(item1.querySelector('span')
            .getAttribute('data-l10n-id'), 'action1-name');
        assert.equal(item1.querySelector('small')
            .textContent, 'action1');

        // item2
        var item2 = renderedList[1];
        assert.equal(item2.querySelector('span')
            .getAttribute('data-l10n-id'), 'action2-name');
        assert.equal(item2.querySelector('small')
            .textContent, 'action2');

        // item3
        var item3 = renderedList[2];
        assert.equal(item3.querySelector('span')
            .getAttribute('data-l10n-id'), 'action3-name');
        assert.equal(item3.querySelector('small')
            .textContent, 'action3');

        done();
      });
    });

  });


});
