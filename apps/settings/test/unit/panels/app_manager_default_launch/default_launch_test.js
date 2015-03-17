'use strict';

require('/shared/test/unit/mocks/mock_default_activity_helper.js');

suite('App Manager :: Default Launch App > ', function() {

  var defaultLaunch,
      mockDefaultActivityHelper;

  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_default_activity_helper',
      'panels/app_default_launch/app_default_launch'
    ];

    var maps = {
      'panels/app_default_launch/app_default_launch': {
        'shared/default_activity_helper':
          'shared_mocks/mock_default_activity_helper'
      }
    };

    testRequire(modules, maps,
      function(DefaultActivityHelper, DefaultLaunchModule) {
        mockDefaultActivityHelper = DefaultActivityHelper;
        defaultLaunch = DefaultLaunchModule();
        done();
      }
    );
  });

  test('should call to ActivityHelper to get data', function() {
    this.sinon.stub(mockDefaultActivityHelper, 'getAllDefaulted')
      .returns(Promise.resolve());

    defaultLaunch.getAll();
    assert.isTrue(mockDefaultActivityHelper.getAllDefaulted.calledOnce);
  });
});
