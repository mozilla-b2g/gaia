/* global MockMobileconnection */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

suite('Call Barring settings', function() {
  var _mobileConnection,
      _serviceClass;

  var callBarring;

  suiteSetup(function(done) {
    var modules = [
      'panels/call_barring/call_barring'
    ];

    var maps = {
      'panels/call_barring/call_barring': {
        'modules/settings_service': 'unit/mock_settings_service'
      }
    };

    testRequire(modules, maps, function(CallBarring) {
      callBarring = CallBarring;
      done();
    });
  });

  setup(function() {
    _mobileConnection = MockMobileconnection();
    _serviceClass = _mobileConnection.ICC_SERVICE_CLASS_VOICE;
  });

  suite('> GET data', function() {
    var _cbServiceMapper = {
      'li-cb-baoc': 0,
      'li-cb-boic': 1,
      'li-cb-boic-exhc': 2,
      'li-cb-baic': 3,
      'li-cb-baic-r': 4
    };

    var serviceOn = {
      set onsuccess(cb) {
        this.result = {
          'enabled': true
        };
        cb.call(this);
      }
    };
    var serviceOff = {
      set onsuccess(cb) {
        this.result = {
          'enabled': false
        };
        cb.call(this);
      }
    };

    test('> When ALL services are OFF', function(done) {
      this.sinon.stub(_mobileConnection,'getCallBarringOption')
        .returns(serviceOff); // OFF for all the cases

      callBarring.getAll(_mobileConnection).then(function finished() {
        assert.isFalse(callBarring.baoc,
          'baoc should not be active');
        assert.isTrue(callBarring.baoc_enabled,
          'baoc should be enabled');

        assert.isFalse(callBarring.boic,
          'boic should not be active');
        assert.isTrue(callBarring.boic_enabled,
          'boic should be enabled');

        assert.isFalse(callBarring.boicExhc,
          'boicExhc should not be active');
        assert.isTrue(callBarring.boicExhc_enabled,
          'boicExhc should be enabled');

        assert.isFalse(callBarring.baic,
          'baic should not be active');
        assert.isTrue(callBarring.baic_enabled,
          'baic should be enabled');

        assert.isFalse(callBarring.baicR,
          'baicR should not be active');
        assert.isTrue(callBarring.baicR_enabled,
          'baicR should be enabled');

        done();
      });
    });

    test('> When BAOC is ON and the rest are OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-baoc'],
        'serviceClass': _serviceClass
      };

      this.sinon.stub(_mobileConnection, 'getCallBarringOption')
        .returns(serviceOff) // OFF for all the cases
        .withArgs(options).returns(serviceOn); // except BAOC

      callBarring.getAll(_mobileConnection).then(function finished() {
        assert.isTrue(callBarring.baoc_enabled,
          'baoc should be enabled');
        assert.isTrue(callBarring.baoc,
          'baoc should be active');

        assert.isFalse(callBarring.boic_enabled,
          'boic should be disabled');
        assert.isFalse(callBarring.boic,
          'boic should not be active');

        assert.isFalse(callBarring.boicExhc_enabled,
          'boicExhc should be disabled');
        assert.isFalse(callBarring.boicExhc,
          'boicExhc should not be active');

        assert.isTrue(callBarring.baic_enabled,
          'baic should be enabled');
        assert.isFalse(callBarring.baic,
          'baic should not be active');

        assert.isTrue(callBarring.baicR_enabled,
          'baicR should be enabled');
        assert.isFalse(callBarring.baicR,
          'baicR should not be active');

        done();
      });
    });

    test('> When BOIC is ON and the rest are OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-boic'],
        'serviceClass': _serviceClass
      };

      this.sinon.stub(_mobileConnection,'getCallBarringOption')
        .returns(serviceOff) // OFF for all the cases
        .withArgs(options).returns(serviceOn); // except BOIC

      callBarring.getAll(_mobileConnection).then(function finished() {
        assert.isTrue(callBarring.baoc_enabled,
          'baoc should be enabled');
        assert.isFalse(callBarring.baoc,
          'baoc should not be active');

        assert.isTrue(callBarring.boic_enabled,
          'boic should be enabled');
        assert.isTrue(callBarring.boic,
          'boic should be active');

        assert.isTrue(callBarring.boicExhc_enabled,
          'boicExhc should be enabled');
        assert.isFalse(callBarring.boicExhc,
          'boicExhc should not be active');

        assert.isTrue(callBarring.baic_enabled,
          'baic should be enabled');
        assert.isFalse(callBarring.baic,
          'baic should not be active');

        assert.isTrue(callBarring.baicR_enabled,
          'baicR should be enabled');
        assert.isFalse(callBarring.baicR,
          'baicR should not be active');

        done();
      });
    });

    test('> When BOIC-Ex-Hc is ON and the rest are OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-boic-exhc'],
        'serviceClass': _serviceClass
      };

      this.sinon.stub(_mobileConnection, 'getCallBarringOption')
        .returns(serviceOff) // OFF for all the cases
        .withArgs(options).returns(serviceOn); // except BOIC-ExHc

      callBarring.getAll(_mobileConnection).then(function finished() {
        assert.isTrue(callBarring.baoc_enabled,
          'baoc should be enabled');
        assert.isFalse(callBarring.baoc,
          'baoc should not be active');

        assert.isTrue(callBarring.boic_enabled,
          'boic should be enabled');
        assert.isFalse(callBarring.boic,
          'boic should not be active');

        assert.isTrue(callBarring.boicExhc_enabled,
          'boicExhc should be enabled');
        assert.isTrue(callBarring.boicExhc,
          'boicExhc should be active');

        assert.isTrue(callBarring.baic_enabled,
          'baic should be enabled');
        assert.isFalse(callBarring.baic,
          'baic should not be active');

        assert.isTrue(callBarring.baicR_enabled,
          'baicR should be enabled');
        assert.isFalse(callBarring.baicR,
          'baicR should not be active');

        done();
      });
    });

    test('> When BOIC is ON and BOIC-Ex-Hc are ON, and the rest are OFF',
    function(done) {
      var options1 = {
        'program': _cbServiceMapper['li-cb-boic'],
        'serviceClass': _serviceClass
      };
      var options2 = {
        'program': _cbServiceMapper['li-cb-boic-exhc'],
        'serviceClass': _serviceClass
      };

      this.sinon.stub(_mobileConnection, 'getCallBarringOption')
        .returns(serviceOff) // OFF for all the cases
        .withArgs(options1).returns(serviceOn) // except for BOIC
        .withArgs(options2).returns(serviceOn); // and BOIC-ExHc

      callBarring.getAll(_mobileConnection).then(function finished() {
        assert.isTrue(callBarring.baoc_enabled,
          'baoc should be enabled');
        assert.isFalse(callBarring.baoc,
          'baoc should not be active');

        assert.isTrue(callBarring.boic_enabled,
          'boic should be enabled');
        assert.isTrue(callBarring.boic,
          'boic should be active');

        assert.isTrue(callBarring.boicExhc_enabled,
          'boicExhc should be enabled');
        assert.isTrue(callBarring.boicExhc,
          'boicExhc should be active');

        assert.isTrue(callBarring.baic_enabled,
          'baic should be enabled');
        assert.isFalse(callBarring.baic,
          'baic should not be active');

        assert.isTrue(callBarring.baicR_enabled,
          'baicR should be enabled');
        assert.isFalse(callBarring.baicR,
          'baicR should not be active');

        done();
      });
    });

    test('> When BAIC is ON and the rest are OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-baic'],
        'serviceClass': _serviceClass
      };

      this.sinon.stub(_mobileConnection, 'getCallBarringOption')
        .returns(serviceOff) // OFF for all the cases
        .withArgs(options).returns(serviceOn); // except BAIC

      callBarring.getAll(_mobileConnection).then(function finished() {
        assert.isTrue(callBarring.baoc_enabled,
          'baoc should be enabled');
        assert.isFalse(callBarring.baoc,
          'baoc should not be active');

        assert.isTrue(callBarring.boic_enabled,
          'boic should be enabled');
        assert.isFalse(callBarring.boic,
          'boic should not be active');

        assert.isTrue(callBarring.boicExhc_enabled,
          'boicExhc should be enabled');
        assert.isFalse(callBarring.boicExhc,
          'boicExhc should not be active');

        assert.isTrue(callBarring.baic_enabled,
          'baic should be enabled');
        assert.isTrue(callBarring.baic,
          'baic should be active');

        assert.isFalse(callBarring.baicR_enabled,
          'baicR should be disabled');
        assert.isFalse(callBarring.baicR,
          'baicR should not be active');

        done();
      });
    });

    test('> When BAIC-R is ON and the rest are OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-baic-r'],
        'serviceClass': _serviceClass
      };

      this.sinon.stub(_mobileConnection, 'getCallBarringOption')
        .returns(serviceOff) // OFF for all the cases
        .withArgs(options).returns(serviceOn); // except for BAIC-R

      callBarring.getAll(_mobileConnection).then(function finished() {
        assert.isTrue(callBarring.baoc_enabled,
          'baoc should be enabled');
        assert.isFalse(callBarring.baoc,
          'baoc should not be active');

        assert.isTrue(callBarring.boic_enabled,
          'boic should be enabled');
        assert.isFalse(callBarring.boic,
          'boic should not be active');

        assert.isTrue(callBarring.boicExhc_enabled,
          'boicExhc should be enabled');
        assert.isFalse(callBarring.boicExhc,
          'boicExhc should not be active');

        assert.isTrue(callBarring.baic_enabled,
          'baic should be enabled');
        assert.isFalse(callBarring.baic,
          'baic should not be active');

        assert.isTrue(callBarring.baicR_enabled,
          'baicR should be enabled');
        assert.isTrue(callBarring.baicR,
          'baicR should be active');

        done();
      });
    });

    test('> When ALL services are ON', function(done) {

      this.sinon.stub(_mobileConnection, 'getCallBarringOption')
        .returns(serviceOn); // ON for all the cases

      callBarring.getAll(_mobileConnection).then(function finished() {
        assert.isTrue(callBarring.baoc_enabled,
          'baoc should be enabled');
        assert.isTrue(callBarring.baoc,
          'baoc should be active');

        assert.isFalse(callBarring.boic_enabled,
          'boic should be disabled');
        assert.isTrue(callBarring.boic,
          'boic should be active');

        assert.isFalse(callBarring.boicExhc_enabled,
          'boicExhc should be disabled');
        assert.isTrue(callBarring.boicExhc,
          'boicExhc should be active');

        assert.isTrue(callBarring.baic_enabled,
          'baic should be enabled');
        assert.isTrue(callBarring.baic,
          'baic should be active');

        assert.isFalse(callBarring.baicR_enabled,
          'baicR should be disabled');
        assert.isTrue(callBarring.baicR,
          'baicR should be active');

        done();
      });
    });
  });
});
