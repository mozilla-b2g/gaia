'use strict';

requireApp('homescreen/test/unit/mock_moz_settings.js');
requireApp('homescreen/test/unit/mock_moz_activity.js');
requireApp('homescreen/test/unit/mock_file_reader.js');

requireApp('homescreen/js/wallpaper.js');

var mocksHelperForWallpaper = new MocksHelper([
  'MozActivity',
  'FileReader'
]);

mocksHelperForWallpaper.init();

suite('wallpaper.js >', function() {

  var mocksHelper = mocksHelperForWallpaper, icongrid;

  suiteSetup(function() {
    mocksHelper.suiteSetup();

    icongrid = document.createElement('div');
    icongrid.id = 'icongrid';
    document.body.appendChild(icongrid);

    Wallpaper.init();
  });

  suiteTeardown(function() {
    document.body.removeChild(icongrid);

    navigator.mozSettings.suiteTeardown();

    mocksHelper.suiteTeardown();
  });

  setup(function() {
    mocksHelper.setup();
    dispatchLongPress();
  });

  teardown(function() {
    mocksHelper.teardown();
    navigator.mozSettings.teardown();
  });

  function dispatchLongPress() {
    icongrid.dispatchEvent(new CustomEvent('contextmenu'));
  }

  function createImageBlob() {
    var data = ['some stuff'];
    var properties = {
      type: 'image/png'
    };

    return new Blob(data, properties);
  }

  function startMozActivity(methodName, blob) {
    var instance = MockMozActivity.instances[0];

    instance.result = {
      blob: blob
    };

    instance[methodName]();
  }

  function getFileReader() {
    // There is only one instance
    assert.equal(MockFileReader.instances.length, 1);

    var fileReader = MockFileReader.instances[0];

    // readAsDataURL method was called
    assert.isTrue(fileReader.readAsDataURLInvoked);

    return fileReader;
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
    assert.equal(activity.data.type, 'image/jpeg');

    // Activity callbacks
    assert.isFunction(instances[0].onsuccess);
    assert.isFunction(instances[0].onerror);
  });

  test('Pick activity returns a blob ', function() {
    // This is the blob returned by the activity
    startMozActivity('onsuccess', createImageBlob());

    var fileReader = getFileReader();
    fileReader.result = 'banana';
    // The blob was read successfully
    fileReader.onload();

    // We set the wallpaper.image property to "banana"
    assert.equal(Object.keys(navigator.mozSettings.result).length, 1);
    assert.equal(navigator.mozSettings.result['wallpaper.image'],
                 fileReader.result);
  });

  test('Pick activity returns a wrong blob ', function() {
    // This is the blob returned by the activity
    startMozActivity('onsuccess', createImageBlob());

    var fileReader = getFileReader();
    // Problems reading the blob received
    fileReader.onerror();

    // wallpaper.image property is not defined
    assert.isNull(navigator.mozSettings.result);
  });

  test('Pick activity returns nothing (no blob) ', function() {
    // MozActivity doesn't return a blob
    startMozActivity('onsuccess');

    // No blob then no FileReader and wallpaper.image property is not defined
    assert.equal(MockFileReader.instances.length, 0);
    assert.isNull(navigator.mozSettings.result);
  });

  test('Pick activity has been cancelled ', function() {
    // User cancels
    startMozActivity('onerror');

    // Then no FileReader and wallpaper.image property is not defined
    assert.equal(MockFileReader.instances.length, 0);
    assert.isNull(navigator.mozSettings.result);
  });

});
