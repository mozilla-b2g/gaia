'use strict';

suite('about > update_check', function() {
  var updateCheck;
  var realL10n;
  var MockSystemUpdateManager;
  var MockAppUpdateManager;

  var modules = [
    'shared_mocks/mock_l10n',
    'panels/about/update_check'
  ];
  var maps = {
    '*': {
      'panels/about/system_update_manager': 'MockSystemUpdateManager',
      'panels/about/app_update_manager': 'MockAppUpdateManager'
    }
  };

  var elements = {
    checkUpdateNow: document.createElement('button'),
    lastUpdateDate: document.createElement('small'),
    systemUpdateInfoMenuItem: document.createElement('li'),
    systemUpdateInfo: document.createElement('p')
  };

  setup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], maps, function() {});

    // Define MockDateTime
    MockSystemUpdateManager = {
      isMock: true,
      UPDATE_STATUS: {
        CHECKING: 0,
        UPDATE_AVAILABLE: 1,
        UPDATE_READY: 2,
        UPDATE_UNAVAILABLE: 3,
        ALREADY_LATEST_VERSION: 4,
        OFFLINE: 5,
        ERROR: 6,
        UNKNOWN: -1
      },
      status: -1,
      observe: function() {}
    };
    define('MockSystemUpdateManager', function() {
      return MockSystemUpdateManager;
    });

    MockAppUpdateManager = {
      isMock: true,
      UPDATE_STATUS: {
        CHECKING: 0,
        UPDATE_AVAILABLE: 1,
        UPDATE_UNAVAILABLE: 2,
        UNKNOWN: -1
      },
      status: -1,
      observe: function() {}
    };
    define('MockAppUpdateManager', function() {
      return MockAppUpdateManager;
    });

    requireCtx(modules, function(MockL10n, module) {
        realL10n = navigator.mozL10n;
        navigator.mozL10n = MockL10n;

        updateCheck = module();
        updateCheck._elements = elements;
        done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(updateCheck, '_updateStatus');
      this.sinon.stub(updateCheck, '_updateLastUpdateDate');

      updateCheck.init(elements);
    });

    test('_updateStatus and _updateLastUpdateDate are called while initiate',
      function() {
        assert.ok(updateCheck._updateStatus.called);
        assert.ok(updateCheck._updateLastUpdateDate.called);
    });
  });

  suite('updateStatus >', function() {
    test('when SystemUpdateManager status is UNKNOWN, ' +
      'the message should be hidden', function() {
      Object.keys(MockSystemUpdateManager.UPDATE_STATUS).forEach(function(key) {
        console.log('AppUpdateManager status is ' + key);
        MockSystemUpdateManager.status =
          MockSystemUpdateManager.UPDATE_STATUS.UNKNOWN;
        MockAppUpdateManager.status = MockAppUpdateManager.UPDATE_STATUS[key];
        updateCheck._updateStatus();

        assert.ok(updateCheck._elements.systemUpdateInfoMenuItem.hidden);
      });
    });

    test('when AppUpdateManager status is UNKNOWN, ' +
      'the message should be hidden', function(){
      Object.keys(MockAppUpdateManager.UPDATE_STATUS).forEach(function(key) {
        console.log('SystemUpdateManager status is ' + key);
        MockSystemUpdateManager.status =
          MockSystemUpdateManager.UPDATE_STATUS[key];
        MockAppUpdateManager.status =
          MockAppUpdateManager.UPDATE_STATUS.UNKNOWN;
        updateCheck._updateStatus();

        assert.ok(updateCheck._elements.systemUpdateInfoMenuItem.hidden);
      });
    });

    test('when SystemUpdateManager status is CHECKING, ' +
      'the message should be checking-for-update', function(){
      Object.keys(MockSystemUpdateManager.UPDATE_STATUS).forEach(function(key) {
        if(key !== 'UNKNOWN') {
          console.log('AppUpdateManager status is ' + key);
          MockSystemUpdateManager.status =
            MockSystemUpdateManager.UPDATE_STATUS.CHECKING;
          MockAppUpdateManager.status = MockAppUpdateManager.UPDATE_STATUS[key];
          updateCheck._updateStatus();

          assert.equal(updateCheck._elements.systemUpdateInfo
            .getAttribute('data-l10n-id'), 'checking-for-update');
          }
          assert.isFalse(updateCheck._elements.systemUpdateInfoMenuItem.hidden);
      });
    });

    test('when AppUpdateManager status is CHECKING, ' +
      'the message should be checking-for-update', function(){
      Object.keys(MockAppUpdateManager.UPDATE_STATUS).forEach(function(key) {
        if(key !== 'UNKNOWN') {
          console.log('SystemUpdateManager status is ' + key);
          MockSystemUpdateManager.status =
            MockSystemUpdateManager.UPDATE_STATUS[key];
          MockAppUpdateManager.status =
            MockAppUpdateManager.UPDATE_STATUS.CHECKING;
          updateCheck._updateStatus();

          assert.equal(updateCheck._elements.systemUpdateInfo
            .getAttribute('data-l10n-id'), 'checking-for-update');
          assert.isFalse(updateCheck._elements.systemUpdateInfoMenuItem.hidden);
        }
      });
    });

    test('when SystemUpdateManager status is UPDATE_AVAILABLE, ' +
      'the message should be update-found', function(){
      Object.keys(MockSystemUpdateManager.UPDATE_STATUS).forEach(function(key) {
        if(key !== 'UNKNOWN' && key !== 'CHECKING') {
          console.log('AppUpdateManager status is ' + key);
          MockSystemUpdateManager.status =
            MockSystemUpdateManager.UPDATE_STATUS.UPDATE_AVAILABLE;
          MockAppUpdateManager.status = MockAppUpdateManager.UPDATE_STATUS[key];
          updateCheck._updateStatus();

          assert.equal(updateCheck._elements.systemUpdateInfo
            .getAttribute('data-l10n-id'), 'update-found');
          assert.isFalse(updateCheck._elements.systemUpdateInfoMenuItem.hidden);
        }
      });
    });

    test('when AppUpdateManager status is UPDATE_AVAILABLE, ' +
      'the message should be update-found', function(){
      Object.keys(MockAppUpdateManager.UPDATE_STATUS).forEach(function(key) {
        if(key !== 'UNKNOWN' && key !== 'CHECKING') {
          console.log('SystemUpdateManager status is ' + key);
          MockSystemUpdateManager.status =
            MockSystemUpdateManager.UPDATE_STATUS[key];
          MockAppUpdateManager.status =
            MockAppUpdateManager.UPDATE_STATUS.UPDATE_AVAILABLE;
          updateCheck._updateStatus();

          assert.equal(updateCheck._elements.systemUpdateInfo
            .getAttribute('data-l10n-id'), 'update-found');
          assert.isFalse(updateCheck._elements.systemUpdateInfoMenuItem.hidden);
        }
      });
    });

    test('when AppUpdateManager status is UPDATE_UNAVAILABLE, ' +
      'the message should depends on systemUpdateManager state', function(){
      var SUMgr = MockSystemUpdateManager;
      var STATUS_MAP = {
        [SUMgr.UPDATE_STATUS.CHECKING]: 'checking-for-update',
        [SUMgr.UPDATE_STATUS.UPDATE_AVAILABLE]: 'update-found',
        [SUMgr.UPDATE_STATUS.UPDATE_READY]: 'ready-to-update',
        [SUMgr.UPDATE_STATUS.UPDATE_UNAVAILABLE]: 'no-updates',
        [SUMgr.UPDATE_STATUS.ALREADY_LATEST_VERSION]: 'already-latest-version',
        [SUMgr.UPDATE_STATUS.OFFLINE]: 'retry-when-online',
        [SUMgr.UPDATE_STATUS.ERROR]: 'check-error',
        [SUMgr.UPDATE_STATUS.UNKNOWN]: null
      };

      Object.keys(MockAppUpdateManager.UPDATE_STATUS).forEach(function(key) {
        if(key !== 'UNKNOWN' &&
           key !== 'CHECKING' &&
           key !== 'UPDATE_AVAILABLE') {
          console.log('SystemUpdateManager status is ' + key);
          MockSystemUpdateManager.status =
            MockSystemUpdateManager.UPDATE_STATUS[key];
          MockAppUpdateManager.status =
            MockAppUpdateManager.UPDATE_STATUS.UPDATE_UNAVAILABLE;
          updateCheck._updateStatus();

          assert.equal(updateCheck._elements.systemUpdateInfo
            .getAttribute('data-l10n-id'),
            STATUS_MAP[MockSystemUpdateManager.UPDATE_STATUS[key]]);
          assert.isFalse(updateCheck._elements.systemUpdateInfoMenuItem.hidden);
        }
      });
    });
  });
});
