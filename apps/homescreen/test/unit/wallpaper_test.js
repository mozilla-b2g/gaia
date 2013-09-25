'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('homescreen/test/unit/mock_moz_activity.js');

requireApp('homescreen/js/wallpaper.js');

var mocksHelperForWallpaper = new MocksHelper([
  'MozActivity'
]);

// A simple mock for shared/js/omadrm/fl.js so we don't have to
// create a more complicated settings mock than what we already have here.
// If I put this in suiteSetup, I get a test error for a leaking global.
window.ForwardLock = { getKey: function(f) { f(null); } };

mocksHelperForWallpaper.init();

suite('wallpaper.js >', function() {

  var mocksHelper = mocksHelperForWallpaper, icongrid;
  var realMozSettings;

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    icongrid = document.createElement('div');
    icongrid.id = 'icongrid';
    document.body.appendChild(icongrid);
  });

  suiteTeardown(function() {
    document.body.removeChild(icongrid);

    navigator.mozSettings = realMozSettings;

    mocksHelper.suiteTeardown();
    delete window.ForwardLock;
  });

  setup(function() {
    mocksHelper.setup();
    dispatchLongPress();
  });

  teardown(function() {
    window.MockNavigatorSettings.mSettings['wallpaper.image'] = null;
    mocksHelper.teardown();
  });

  function dispatchLongPress() {
    Wallpaper.contextmenu();
  }

  function FakeBlob(data) {
    return {
      type: 'image/png',
      data: data
    };
  }

  function startMozActivity(methodName, blob) {
    var instance = MockMozActivity.instances[0];

    instance.result = {
      blob: blob
    };

    instance[methodName]();
  }

  test('The MozActivity was initialized correctly ', function() {
    // There is only one activity running
    var activities = MockMozActivity.calls;
    assert.equal(activities.length, 1);

    var instances = MockMozActivity.instances;
    assert.equal(instances.length, 1);

    // Activity data
    var activity = activities[0];
    assert.equal(activity.name, 'pick');
    assert.ok(activity.data.type === 'wallpaper' ||
              (Array.isArray(activity.data.type) &&
               activity.data.type.indexOf('wallpaper') >= 0),
              'activity type is or includes "wallpaper"');

    // Activity callbacks
    assert.isFunction(instances[0].onsuccess);
    assert.isFunction(instances[0].onerror);
  });

  test('Pick activity returns a blob ', function() {
    var fakeblob = FakeBlob('banana');

    // This is the blob returned by the activity
    startMozActivity('onsuccess', fakeblob);

    // We set the wallpaper.image property to "banana"
    assert.deepEqual(window.MockNavigatorSettings.mSettings['wallpaper.image'],
                     fakeblob);
  });

  test('Pick activity returns nothing (no blob) ', function() {
    // MozActivity doesn't return a blob
    startMozActivity('onsuccess');

    // No blob then wallpaper.image property is not defined
    assert.isNull(window.MockNavigatorSettings.mSettings['wallpaper.image']);
  });

  test('Pick activity has been cancelled ', function() {
    // User cancels
    startMozActivity('onerror');

    // Then  wallpaper.image property is not defined
    assert.isNull(window.MockNavigatorSettings.mSettings['wallpaper.image']);
  });
});
