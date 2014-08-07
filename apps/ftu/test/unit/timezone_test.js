/* global MocksHelper, MockNavigatorSettings,
          MockL10n, MockNavigatorMozMobileConnections,
          IccHelper, tzSelect
*/

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_icc_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');

require('/shared/test/unit/load_body_html_helper.js');

var mocksHelperForTimezones = new MocksHelper([
  'IccHelper'
]).init();

suite('timezones >', function() {
  var realMozMobileConnections,
      realMozSettings,
      realXHR,
      realL10n;

  var regionSelector, citySelector;

  var TIMEZONES = {
    'Africa': [
      {'cc':'NA', 'offset':'+01:00,+02:00', 'city':'Windhoek'}
    ],
    'America': [
      {'cc':'VE', 'offset':'-04:30,-04:30', 'city':'Caracas'},
      {'cc':'US', 'offset':'-05:00,-04:00', 'city':'New_York'}
    ],
    'Asia': [
      {'cc':'TW', 'offset':'+08:00,+08:00', 'city':'Taipei'}
    ],
    'Australia': [
      {'cc':'AU', 'offset':'+10:00,+11:00', 'city':'Sydney'}
    ],
    'Europe': [
      {'cc':'ES', 'offset':'+01:00,+02:00', 'city':'Madrid'},
      {'cc':'GB', 'offset':'+00:00,+01:00', 'city':'London'}
    ],
    'Indian': [
      {'cc':'RE', 'offset':'+04:00,+04:00', 'city':'Reunion'}
    ]
  };
  var APN_TZ = {
    '649': 'Africa/Windhoek',
    '734': 'America/Caracas',
    '310': 'America/New_York',
    '311': 'America/New_York',
    '466': 'Asia/Taipei',
    '505': 'Australia/Sydney',
    '647': 'Indian/Reunion',
    '214': 'Europe/Madrid',
    '234': {
      '00': 'Europe/London',
      '02': 'Europe/London',
      '03': 'Europe/Jersey',
      '10': 'Europe/London',
      '11': 'Europe/London',
      '15': 'Europe/London',
      '20': 'Europe/London',
      '30': 'Europe/London',
      '31': 'Europe/London',
      '32': 'Europe/London',
      '33': 'Europe/London',
      '34': 'Europe/London',
      '36': 'Europe/Isle_of_Man',
      '50': 'Europe/Jersey',
      '55': 'Europe/Jersey',
      '58': 'Europe/Isle_of_Man'
    }
  };

  function getTextFromSelectors() {
    // Careful with the text transformations for the lists
    // we add 'tzRegion-' to mapped regions
    var mRegion = regionSelector.querySelectorAll('option')
      [regionSelector.selectedIndex].textContent.split('-')[1];
    var mCity = citySelector.querySelectorAll('option')
      [citySelector.selectedIndex].textContent;
    return {
      region: mRegion,
      city: mCity
    };
  }

  function MockXMLHttpRequest() {
    var mResponse = MockXMLHttpRequest.mResponse;
    this.open = function(method, url) {
      if (url) {
        var urlArray = url.split('/');
        var file = urlArray[urlArray.length - 1].split('.')[0];
        switch (file) {
          case 'tz':
            mResponse = TIMEZONES;
            break;
          case 'apn_tz':
            mResponse = APN_TZ;
            break;
        }
      }
    };
    this.send = function() {
      this.response = mResponse;
      this.timeout = setTimeout(this.onload.bind(this));
    };
    this.abort = function() {
      if (this.timeout) {
        clearTimeout(this.clearTimeout);
      }
    };
  }
  mocksHelperForTimezones.attachTestHelpers();

  suiteSetup(function(done) {
    // we use the real XHR here, and mock it for the rest of the tests
    loadBodyHTML('/index.html');

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSettings['time.timezone'] = 'America/New_York';
    MockNavigatorSettings.mSettings['time.timezone.user-selected'] = null;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = MockXMLHttpRequest;

    require('/shared/js/tz_select.js', done);

    regionSelector = document.getElementById('tz-region');
    citySelector = document.getElementById('tz-city');
  });

  suiteTeardown(function() {
    navigator.mozMobileConnections = realMozMobileConnections;
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realL10n;
    window.XMLHttpRequest = realXHR;
  });

  test('> observing changes on time.timezone', function() {
    assert.isNotNull(navigator.mozSettings.mObservers['time.timezone']);
  });

  test('> no previous user interaction, use DEFAULT timezone', function() {
    assert.equal(navigator.mozSettings.mSettings['time.timezone'],
                'America/New_York');
  });

  suite('> very first run, no user interaction', function() {
    suite('> no SIM card', function() {
      setup(function() {
        IccHelper.setProperty('iccInfo', null);
      });

      test('we use DEFAULT value', function(done) {
        function tzLoaded(timezone, needsConfirmation) {
          var currentValues = getTextFromSelectors();
          assert.equal(currentValues.region, 'America');
          assert.equal(currentValues.city, 'New York');
          assert.isTrue(needsConfirmation);
          done();
        }

        tzSelect(regionSelector, citySelector, tzLoaded, tzLoaded);
      });
    });

    suite('> SIM ready, connection avaiable', function() {
      var conn;

      suiteSetup(function() {
        // we need a live connection for this test (network)
        conn = new window.MockMobileconnection();
        conn.voice = {
          connected: true,
          network: {
            mcc: 466, // Asia / Taipei
            mnc: 2
          }
        };

        MockNavigatorMozMobileConnections.mAddMobileConnection(conn, 0);
      });

      suiteTeardown(function() {
        conn = null;
        MockNavigatorMozMobileConnections.mRemoveMobileConnection();
      });

      test('get timezone from the connection', function(done) {
        function tzLoaded(timezone, needsConfirmation) {
          var currentValues = getTextFromSelectors();
          assert.equal(currentValues.region, 'Australia');
          assert.equal(currentValues.city, 'Sydney');
          // When the timezone (and presumably the time) is loaded from
          // network, it doesn't need to be confirmed by the user.
          assert.isFalse(needsConfirmation);
          done();
        }

        conn.voice.network.mcc = 505; // Australia/Sydney
        tzSelect(regionSelector, citySelector, tzLoaded, tzLoaded);
      });

      test('if unknown MCC/MNC, use default', function(done) {
        function tzLoaded(timezone, needsConfirmation) {
          var currentValues = getTextFromSelectors();
          // DEFAULT is America/New_York
          assert.equal(currentValues.region, 'America');
          assert.equal(currentValues.city, 'New York');
          assert.isTrue(needsConfirmation);
          done();
        }

        conn.voice.network.mcc = 1; // unknown
        conn.voice.network.mnc = 1; // unknown
        tzSelect(regionSelector, citySelector, tzLoaded, tzLoaded);
      });
    });

    suite('> SIM ready, no connection', function() {
      var conn;

      setup(function() {
        // no connection
        conn = new window.MockMobileconnection();
        conn.voice = null;
        MockNavigatorMozMobileConnections.mAddMobileConnection(conn, 0);
        // but access to the SIM data
        IccHelper.setProperty('cardstate', 'ready');
      });

     teardown(function() {
        conn = null;
        MockNavigatorMozMobileConnections.mRemoveMobileConnection();
        IccHelper.mSuiteSetup(); // reset the object properties
      });

      test('get timezone from SIM', function(done) {
        function tzLoaded(timezone, needsConfirmation) {
          var currentValues = getTextFromSelectors();
          assert.equal(currentValues.region, 'Europe');
          assert.equal(currentValues.city, 'London');
          assert.isTrue(needsConfirmation);
          done();
        }

        IccHelper.setProperty('iccInfo',{
          mcc: 234, // Europe/London
          mnc: 32
        });

        tzSelect(regionSelector, citySelector, tzLoaded, tzLoaded);
      });

      test('if unknown MCC/MNC, use default', function(done) {
        function tzLoaded(timezone, needsConfirmation) {
          var currentValues = getTextFromSelectors();
          assert.equal(currentValues.region, 'America');
          assert.equal(currentValues.city, 'New York');
          assert.isTrue(needsConfirmation);
          done();
        }

        IccHelper.setProperty('iccInfo',{
          mcc: 0, // unknown
          mnc: 0  // unknown
        });
        tzSelect(regionSelector, citySelector, tzLoaded, tzLoaded);
      });
    });

    suite('> protected SIM card', function() {
      var conn;

      setup(function() {
        // no connection
        conn = new window.MockMobileconnection();
        conn.voice = null;
        MockNavigatorMozMobileConnections.mAddMobileConnection(conn, 0);

        // but access to the SIM data
        IccHelper.setProperty('cardstate', 'pin_required');
      });

      teardown(function() {
        MockNavigatorMozMobileConnections.mRemoveMobileConnection();
        IccHelper.mSuiteSetup(); // reset the object properties
      });

      test('> default is used while waiting for access', function(done) {
        function tzLoaded(timezone, needsConfirmation) {
          var currentValues = getTextFromSelectors();
          assert.lengthOf(IccHelper.mEventListeners.iccinfochange, 1);
          assert.equal(currentValues.region, 'America');
          assert.equal(currentValues.city, 'New York');
          assert.isTrue(needsConfirmation);
          done();
        }

        tzSelect(regionSelector, citySelector, tzLoaded, tzLoaded);
      });

      test('> reload when granted access to SIM info', function(done) {
        var calls = 0;
        function tzLoaded(timezone, needsConfirmation) {
          calls++;
          IccHelper.mTriggerEventListeners('iccinfochange', {});
          var currentValues = getTextFromSelectors();
          assert.equal(currentValues.region, 'Europe');
          assert.equal(currentValues.city, 'London');
          assert.isTrue(needsConfirmation);
          // we expect 2 calls before finishing
          if (calls === 2) {
            done();
          }
        }

        IccHelper.setProperty('iccInfo',{
          mcc: 234, // Europe
          mnc: 20  // London
        });
        tzSelect(regionSelector, citySelector, tzLoaded, tzLoaded);
      });
    });
  });

  suite('> user chose previously', function() {
    // var addEventListenerSpy;

    suiteSetup(function() {
      MockNavigatorSettings.mSettings['time.timezone.user-selected'] =
        'Europe/Madrid';
    });
    suiteTeardown(function() {
      MockNavigatorSettings.mSettings['time.timezone.user-selected'] = null;
    });

    // setup(function() {
    //   addEventListenerSpy = this.sinon.spy(window, 'addEventListener');
    // });

    test('> previous selection prevails', function(done) {
      function tzLoaded(timezone, needsConfirmation) {
        var currentValues = getTextFromSelectors();
        assert.equal(currentValues.region, 'Europe');
        assert.equal(currentValues.city, 'Madrid');
        assert.isTrue(needsConfirmation);
        done();
      }

      tzSelect(regionSelector, citySelector, tzLoaded, tzLoaded);
      // addEventListenerSpy.yield({target: window});
    });
  });
});
