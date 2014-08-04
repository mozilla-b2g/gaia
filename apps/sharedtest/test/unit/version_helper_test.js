/* global VersionHelper, MockNavigatorSettings */
'use strict';

require('/shared/js/version_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

// test that:
//  API has expected behaviour: ready,
suite('VersionHelper > ', function() {
  var realSettings;
	suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });
  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
  });

  test('getVersionInfo', function(done) {
    var promise = VersionHelper.getVersionInfo();
    assert.equal(typeof promise.then, 'function',
                'getVersionInfo returns a then-able');
    function onOutcome(info) {
      assert.ok(info && !(info instanceof Error));
      assert.ok('current' in info);
      assert.equal(typeof info.isUpgrade, 'function');
      assert.equal(typeof info.delta, 'function');
    }
    promise.then(onOutcome, onOutcome).then(done, done);
  });

  suite('unknown previous version > ', function() {
    setup(function(done) {
      navigator.mozSettings.mSettings['deviceinfo.os'] = '2.0.1';
      var fixture = this;
      VersionHelper.getVersionInfo().then(function(result) {
        fixture.versionInfo = result;
        done();
      });
    });

    test('settings are reflected properly', function() {
      var info = this.versionInfo;
      assert.equal(info.current.major, 2);
      assert.equal(info.current.minor, 0);
      assert.ok(!info.previous, 'previous version is falsey');
    });
    test('delta', function() {
      var delta = this.versionInfo.delta();
      assert.equal(delta, '..2.0');
    });
    test('version toString', function() {
      assert.equal(this.versionInfo.current.toString(),
                   '2.0.1');
    });
    test('isUpgrade', function() {
      assert.isFalse(this.versionInfo.isUpgrade());
    });
  });

  suite('known previous version > ', function() {
    setup(function(done) {
      var req = navigator.mozSettings.createLock().set({
        'deviceinfo.os': '2.1.0',
        'deviceinfo.previous_os': '1.4.1',
      });
      var fixture = this;
      req.onsuccess = function() {
        VersionHelper.getVersionInfo().then(function(info) {
          fixture.versionInfo = info;
          done();
        });
      };
      req.onerror = function() {
        throw new Error('Failed to setup deviceinfo.* setting on mock');
      };
    });

    test('settings are reflected properly', function() {
      var info = this.versionInfo;
      assert.equal(info.previous.major, 1);
      assert.equal(info.previous.minor, 4);
    });
    test('delta', function() {
      var delta = this.versionInfo.delta();
      assert.equal(delta, '1.4..2.1');
    });
    test('isUpgrade', function() {
      assert.isTrue(this.versionInfo.isUpgrade());
    });
  });

  suite('update > ', function() {
    setup(function(done) {
      var fixture = this;
      var req = navigator.mozSettings.createLock().set({
        'deviceinfo.os': '2.0.1',
        'deviceinfo.previous_os': '1.4.1',
      });
      req.onsuccess = function() {
        VersionHelper.getVersionInfo().then(function(result) {
          fixture.versionInfo = result;
          done();
        });
      };
      req.onerror = function() {
        throw new Error('Failed to setup deviceinfo.* setting on mock');
      };
    });

    test('previous_os', function(done){
      var fixture = this;
      VersionHelper.updatePrevious().then(function(){
        assert.equal(navigator.mozSettings.mSettings['deviceinfo.previous_os'],
                    '2.0.1', 'setting is updated');
        assert.equal(fixture.versionInfo.previous.toString(),
                    '1.4.1', 'previous in-memory version is maintained after' +
                    ' updatePrevious()');
      }, function() {
        assert.isFalse('fail at comparing previous_os settings');
      }).then(done, done);
    });
  });
});
