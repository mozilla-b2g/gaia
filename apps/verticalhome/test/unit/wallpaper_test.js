'use strict';

/* global MocksHelper, MockMozActivity, MockNavigatorSettings, wallpaper */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/js/wallpaper.js');

var mocksHelperForWallpaper = new MocksHelper([
  'MozActivity'
]).init();

// A simple mock for shared/js/omadrm/fl.js so we don't have to
// create a more complicated settings mock than what we already have here.
// If I put this in suiteSetup, I get a test error for a leaking global.
window.ForwardLock = { getKey: function(f) { f(null); } };

mocksHelperForWallpaper.attachTestHelpers();

suite('wallpaper.js >', function() {

  var realMozSettings, activitySub;

  suiteSetup(function() {
    activitySub = sinon.stub(window, 'MozActivity', function(info) {
      MockMozActivity.calls.push(info);
      MockMozActivity.instances.push(this);
    });
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    activitySub.restore();
    navigator.mozSettings = realMozSettings;
    delete window.ForwardLock;
  });

  setup(function() {
    wallpaper.change();
  });

  teardown(function() {
    window.MockNavigatorSettings.mSettings['wallpaper.image'] = null;
  });

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
