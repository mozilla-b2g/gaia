/* global MockL10n */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('DevicePickerPanel', function() {
  var realL10n;
  var devicePickerPanel;
  var btContext;
  var btTemplateFactory;
  var listView;

  suiteSetup(function() {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    loadBodyHTML('./_transfer.html');
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  setup(function(done) {
    var modules = [
      'modules/bluetooth/bluetooth_context',
      'views/bt_template_factory',
      'modules/mvvm/list_view',
      'views/device_picker_panel'
    ];

    var map = {
      '*': {
        'modules/bluetooth/bluetooth_context': 'MockBluetoothContext',
        'modules/mvvm/list_view': 'MockListView'
      }
    };

    this.MockBluetoothContext = {
      observe: function() {},
      getPairedDevices: function() {},
      getRemoteDevices: function() {},
      hasPairedDevice: false,
      state: 'disabled',
      discovering: false,
      startDiscovery: function() {return Promise.resolve();},
      pair: function() {}
    };

    define('MockBluetoothContext', function() {
      return this.MockBluetoothContext;
    }.bind(this));

    this.MockListView = function MockListView() {
      return {};
    };

    define('MockListView', function() {
      return this.MockListView;
    }.bind(this));

    testRequire(modules, map, function(BluetoothContext, BtTemplateFactory,
                                       ListView, DevicePickerPanel) {
      btContext = BluetoothContext;
      btTemplateFactory = BtTemplateFactory;
      listView = ListView;
      devicePickerPanel = DevicePickerPanel;
      done();
    });
  });

  suite('_Init > ', function() {
    setup(function() {
      this.sinon.stub(devicePickerPanel._elements.header.headerActionClose,
        'addEventListener');
      this.sinon.stub(devicePickerPanel._elements.search.searchButton,
        'addEventListener');
      devicePickerPanel._pairedDevicesListView = null;
      devicePickerPanel._foundDevicesListView = null;
      this.sinon.stub(devicePickerPanel, '_initItemsState');
      this.sinon.stub(btContext, 'startDiscovery').returns(Promise.resolve());
    });

    test('The close button of header should be regedit action callback, ' +
         'search button should be regedit onclick callback, ' +
         'paired/found list view should be defined, ' +
         '_initItemsState() should be called ' +
         'BtContext.startDiscovery() should be called ', function() {
      devicePickerPanel._init();
      // close button
      assert.equal(
        devicePickerPanel._elements.header.headerActionClose.
          addEventListener.args[0][0], 'action');
      assert.isDefined(
        devicePickerPanel._elements.header.headerActionClose.
          addEventListener.args[0][1]);
      // search button
      assert.equal(
        devicePickerPanel._elements.search.searchButton.
          addEventListener.args[0][0], 'click');
      assert.isDefined(
        devicePickerPanel._elements.search.searchButton.
          addEventListener.args[0][1]);
      // paired/found list view
      assert.isDefined(devicePickerPanel._pairedDevicesListView);
      assert.isDefined(devicePickerPanel._foundDevicesListView);
      assert.isTrue(devicePickerPanel._initItemsState.called);
      assert.isTrue(btContext.startDiscovery.called);
    });
  });

  suite('_initItemsState > ', function() {
    setup(function() {
      this.sinon.stub(btContext, 'observe');
      this.sinon.stub(devicePickerPanel, '_updatePairedDevicesHeader');
      this.sinon.stub(devicePickerPanel, '_updatePairedDevicesList');
      this.sinon.stub(devicePickerPanel, '_updateFoundDevicesList');
      this.sinon.stub(devicePickerPanel, '_updateSearchItem');
      this.sinon.stub(devicePickerPanel, '_updateSearchingItem');
    });

    test('btContext.hasPairedDevice should be observed with callback, ' +
         'btContext.state should be observed with callback, ' +
         'btContext.discovering should be observed with callback, ' +
         'paired device header, paired/found device list, ' +
         'search/searching item should be updated.. ', function() {
      devicePickerPanel._initItemsState();
      // paired device header
      assert.equal(btContext.observe.args[0][0], 'hasPairedDevice');
      assert.isDefined(btContext.observe.args[0][1]);
      assert.isTrue(devicePickerPanel._updatePairedDevicesHeader.called);
      // paired device list
      assert.equal(btContext.observe.args[1][0], 'state');
      assert.isDefined(btContext.observe.args[1][1]);
      assert.isTrue(devicePickerPanel._updatePairedDevicesList.called);
      // found device list
      assert.equal(btContext.observe.args[2][0], 'state');
      assert.isDefined(btContext.observe.args[2][1]);
      assert.isTrue(devicePickerPanel._updateFoundDevicesList.called);
      // search item
      assert.equal(btContext.observe.args[3][0], 'state');
      assert.isDefined(btContext.observe.args[3][1]);
      assert.isTrue(devicePickerPanel._updateSearchItem.called);
      // searching item
      assert.equal(btContext.observe.args[4][0], 'discovering');
      assert.isDefined(btContext.observe.args[4][1]);
      assert.isTrue(devicePickerPanel._updateSearchingItem.called);
    });
  });

  suite('_onHeaderActionCloseClick > ', function() {
    var expectedEvent = {
      type: 'cancelSelection'
    };
    setup(function() {
      this.sinon.stub(devicePickerPanel, '_emitEvent');
    });

    test('_emitEvent() should be called with event, type = "cancelSelection" ' +
         'while _onHeaderActionCloseClick() be called ', function() {
      devicePickerPanel._onHeaderActionCloseClick();
      assert.isTrue(devicePickerPanel._emitEvent.calledWith(expectedEvent));
    });
  });

  suite('_onSearchButtonClick > ', function() {
    setup(function() {
      this.sinon.stub(btContext, 'startDiscovery').returns(Promise.resolve());
    });

    test('btContext.startDiscovery() should be called while ' +
         'search button is clicked ', function() {
      devicePickerPanel._onSearchButtonClick();
      assert.isTrue(btContext.startDiscovery.called);
    });
  });

  suite('_onPairedDeviceItemClick > ', function() {
    var mockDeviceItem, expectedEvent;
    setup(function() {
      mockDeviceItem = {
        address: 'AA:BB:CC:00:11:22'
      };
      expectedEvent = {
        type: 'devicePicked',
        detail: {
          address: mockDeviceItem.address
        }
      };
      this.sinon.stub(devicePickerPanel, '_emitEvent');
    });

    test('_emitEvent() should be called with event, type = "devicePicked" ' +
         'while _onPairedDeviceItemClick() be called with device item ',
         function() {
      devicePickerPanel._onPairedDeviceItemClick(mockDeviceItem);
      assert.isTrue(devicePickerPanel._emitEvent.calledWith(expectedEvent));
    });
  });

  suite('_onFoundDeviceItemClick > ', function() {
    var mockDeviceItem, mockPairPromise;
    suite('btContext.pair() with resolve > ', function() {
      var expectedEvent;
      setup(function() {
        mockDeviceItem = {
          address: 'AA:BB:CC:00:11:22',
          paired: false
        };
        expectedEvent = {
          type: 'devicePicked',
          detail: {
            address: mockDeviceItem.address
          }
        };
        mockPairPromise = Promise.resolve();
        this.sinon.stub(btContext, 'pair').returns(mockPairPromise);
        this.sinon.stub(devicePickerPanel, '_emitEvent');
        this.sinon.stub(devicePickerPanel, '_alertPairFailedErrorMessage');
      });

      test('the "paired" property of device item should be set "pairing", ' +
           '_emitEvent() should be called with event, type = "devicePicked," ' +
           '_alertPairFailedErrorMessage() should not be called ' +
           'while _onFoundDeviceItemClick() be called with device item ',
           function(done) {
        devicePickerPanel._onFoundDeviceItemClick(mockDeviceItem);
        assert.equal(mockDeviceItem.paired, 'pairing');
        mockPairPromise.then(() => {
          assert.isTrue(devicePickerPanel._emitEvent.calledWith(expectedEvent));
          assert.isFalse(devicePickerPanel._alertPairFailedErrorMessage.called);
        }, () => {
          // reject case
        }).then(done, done);
      });
    });

    suite('btContext.pair() with reject > ', function() {
      setup(function() {
        mockDeviceItem = {
          address: 'AA:BB:CC:00:11:22',
          paired: false
        };
        mockPairPromise = Promise.reject();
        this.sinon.stub(btContext, 'pair').returns(mockPairPromise);
        this.sinon.stub(devicePickerPanel, '_emitEvent');
        this.sinon.stub(devicePickerPanel, '_alertPairFailedErrorMessage');
      });

      test('the "paired" property of device item should be set "pairing", ' +
           'then the property will be set to false in pair rejected case, ' +
           '_emitEvent() should not be called, ' +
           '_alertPairFailedErrorMessage() should be called ' +
           'while _onFoundDeviceItemClick() be called with device item ',
           function(done) {
        devicePickerPanel._onFoundDeviceItemClick(mockDeviceItem);
        assert.equal(mockDeviceItem.paired, 'pairing');
        mockPairPromise.then(() => {
          // resolve case
        }, () => {
          assert.isFalse(mockDeviceItem.paired);
          assert.isFalse(devicePickerPanel._emitEvent.called);
          assert.isTrue(devicePickerPanel._alertPairFailedErrorMessage.called);
        }).then(done, done);
      });
    });
  });

  suite('_alertPairFailedErrorMessage > ', function() {
    var mockErrorReason, expectedMsg;
    suite('no errorReason > ', function() {
      setup(function() {
        mockErrorReason = null;
        expectedMsg = 'error-pair-title';
        this.sinon.stub(window, 'alert');
      });

      test('Show default message if there is no error reason ', function() {
        devicePickerPanel._alertPairFailedErrorMessage(mockErrorReason);
        assert.isTrue(window.alert.calledWith(expectedMsg));
      });
    });
    
    suite('has errorReason "Authentication Failed" > ', function() {
      setup(function() {
        mockErrorReason = 'Authentication Failed';
        expectedMsg = 'error-pair-title' + '\n' + 'error-pair-pincode';
        this.sinon.stub(window, 'alert');
      });

      test('Show message with pincode error if error reason is ' +
           '"Authentication Failed" ', function() {
        devicePickerPanel._alertPairFailedErrorMessage(mockErrorReason);
        assert.isTrue(window.alert.calledWith(expectedMsg));
      });
    });
  });

  suite('visible > ', function() {
    setup(function() {
      devicePickerPanel._elements.view.viewDevicePicker.hidden = true;
    });

    test('device picker view should be set visible', function() {
      devicePickerPanel.visible = true;
      assert.isFalse(devicePickerPanel._elements.view.viewDevicePicker.hidden);
    });
  });
});
