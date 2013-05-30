'use strict';
requireApp('system/js/orientation_observer.js');

suite('orientation observer >', function() {
  var subject;
  var portraitPrimary = {
    beta: -90,
    alpha: 0,
    gamma: 0
  };
  var portraitSecondary = {
    beta: 90,
    alpha: 0,
    gamma: 0
  };
  var landscapePrimary = {
    beta: 0,
    alpha: 0,
    gamma: 90
  };
  var landscapeSecondary = {
    beta: 0,
    alpha: 0,
    gamma: -90
  };

  var coordinate = {
    'portrait-primary': portraitPrimary,
    'portrait-secondary': portraitSecondary,
    'landscape-primary': landscapePrimary,
    'landscape-secondary': landscapeSecondary
  };

  var appOrientationTestData = [
    {app: null, device: 'portrait-primary', result: 'portrait-primary'},
    {app: null, device: 'portrait-secondary', result: 'portrait-secondary'},
    {app: null, device: 'landscape-primary', result: 'landscape-primary'},
    {app: null, device: 'landscape-secondary', result: 'landscape-secondary'},

    {app: 'portrait', device: 'portrait-primary',
                      result: 'portrait-primary'},
    {app: 'portrait', device: 'portrait-secondary',
                      result: 'portrait-secondary'},
    {app: 'portrait', device: 'landscape-primary',
                      result: 'portrait-primary'},
    {app: 'portrait', device: 'landscape-secondary',
                      result: 'portrait-primary'},

    {app: 'landscape', device: 'portrait-primary',
                       result: 'landscape-primary'},
    {app: 'landscape', device: 'portrait-secondary',
                       result: 'landscape-primary'},
    {app: 'landscape', device: 'landscape-primary',
                       result: 'landscape-primary'},
    {app: 'landscape', device: 'landscape-secondary',
                       result: 'landscape-secondary'},

    {app: 'portrait-primary', device: 'landscape-secondary',
                                 result: 'portrait-primary'},
    {app: 'portrait-secondary', device: 'landscape-primary',
                                 result: 'portrait-secondary'},
    {app: 'landscape-primary', device: 'portrait-primary',
                                 result: 'landscape-primary'},
    {app: 'landscape-secondary', device: 'landscape-primary',
                                 result: 'landscape-secondary'}
  ];

  setup(function() {
    subject = OrientationObserver;
    subject.handleEvent({type: 'screenchange', detail: {screenEnabled: true}});
  });

  var makeOrientationEvent = function(coordinate) {
    return {
      type: 'deviceorientation',
      alpha: coordinate.alpha,
      beta: coordinate.beta,
      gamma: coordinate.gamma
    };
  };

  test('orientation event handler', function() {
    for (var key in coordinate) {
      subject.handleEvent(makeOrientationEvent(coordinate[key]));
      assert.equal(subject.deviceOrientation, key);
    }
  });

  test('app orientation determinator', function() {
    appOrientationTestData.forEach(function(elem) {
      subject.handleEvent(makeOrientationEvent(coordinate[elem.device]));
      assert.equal(subject.determine(elem.app), elem.result);
    });
  });

  teardown(function() {});
});
