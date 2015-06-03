'use strict';
/* jshint browser: true */
/* global TVDeck, MocksHelper, MockTVManager, MockNavigatormozApps */

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/smart-screen/mock_key_navigation_adapter.js');
require('/shared/test/unit/mocks/smart-screen/mock_simple_key_navigation.js');
require('/shared/test/unit/mocks/smart-screen/mock_tv_channel.js');
require('/shared/test/unit/mocks/smart-screen/mock_tv_source.js');
require('/shared/test/unit/mocks/smart-screen/mock_tv_tuner.js');
require('/shared/test/unit/mocks/smart-screen/mock_tv_manager.js');
require('/shared/test/unit/mocks/smart-screen/mock_channel_manager.js');
require('/bower_components/smart-bubbles/script.js');
require('/test/unit/mock_pin_card.js');
require('/js/tv_deck.js');

var mocksHelper = new MocksHelper([
  'PinCard',
  'ChannelManager',
  'KeyNavigationAdapter',
  'SimpleKeyNavigation'
]).init();

suite('tv-deck/tv_deck', function() {

  var MockasyncStorage;
  var realMozApps;
  var realTVManager;
  var realasyncStorage;
  var tvDeck;

  mocksHelper.attachTestHelpers();

  function createMockElement(id, type) {
    var element;
    element = document.createElement(type || 'div');
    element.id = id;
    document.body.appendChild(element);
    return element;
  }

  function createMockUI() {
    createMockElement('overlay');
    createMockElement('tv-stream', 'video');
    createMockElement('channel-panel');
    createMockElement('channel-number');
    createMockElement('channel-title');
    createMockElement('button-group-panel');
    createMockElement('pin-button');
    createMockElement('pin-button-contextmenu');
    createMockElement('menu-button');
    createMockElement('loading-icon');
    createMockElement('bubble-animation', 'smart-bubbles');
  }

  suiteSetup(function() {
    createMockUI();
    sinon.stub(window, 'addEventListener');
    MockasyncStorage = {
      _value: {},
      getItem: function(name, callback) {
        callback(this._value[name]);
      }
    };
  });

  setup(function() {
    realTVManager = window.navigator.tv;
    realMozApps = window.navigator.mozApps;
    realasyncStorage = window.asyncStorage;
    window.navigator.tv = new MockTVManager();
    window.navigator.mozApps = MockNavigatormozApps;
    window.asyncStorage = MockasyncStorage;

    window.location.hash = '';
    window.localStorage.removeItem('TV_Hash');
    tvDeck = new TVDeck();
    MockNavigatormozApps.mTriggerLastRequestSuccess({
      origin: 'test://origin',
      manifestURL: 'test://manifestURL'
    });
  });

  teardown(function() {
    window.navigator.tv = realTVManager;
    window.navigator.mozApps = realMozApps;
    window.asyncStorage = realasyncStorage;
  });

  suite('Initilization', function() {
    test('enterNumberTimeoutDelay should be greater than 0', function() {
      assert(tvDeck.enterNumberTimeoutDelay > 0);
    });

    test('panelTimeoutDelay should be greater than 0', function() {
      assert(tvDeck.panelTimeoutDelay > 0);
    });

    test('Must have video element', function() {
      assert.isDefined(tvDeck.tvStreamElement);
    });

    test('lastChannelId should be 0', function() {
      assert.equal(tvDeck.lastChannelId, 0);
    });
  });

  suite('_onHashChange()', function() {
    test('lastChannelId should not be the same', function() {
      var id = tvDeck.lastChannelId;
      tvDeck._onHashChange();
      assert.notEqual(id, tvDeck.lastChannelId);
    });

    test('Rescan tuners if playing tuner is not found', function() {
      var scanTuners = this.sinon.stub(tvDeck.channelManager, 'scanTuners');
      this.sinon.stub(tvDeck.channelManager, 'getTuner').returns(null);
      tvDeck._onHashChange();
      assert.isTrue(scanTuners.called);
    });

    test('Rescan sources if playing source is not found', function() {
      var scanSources = this.sinon.stub(tvDeck.channelManager, 'scanSources');
      this.sinon.stub(tvDeck.channelManager, 'getTuner').returns({});
      this.sinon.stub(tvDeck.channelManager, 'getSource').returns(null);
      tvDeck._onHashChange();
      assert.isTrue(scanSources.called);
    });

    test('Rescan channels if playing channel is not found', function() {
      var scanChannels = this.sinon.stub(tvDeck.channelManager, 'scanChannels');
      this.sinon.stub(tvDeck.channelManager, 'getTuner').returns({});
      this.sinon.stub(tvDeck.channelManager, 'getSource').returns({});
      tvDeck._onHashChange();
      assert.isTrue(scanChannels.called);
    });

    test('buttonGroupPanel should be hidden', function() {
      tvDeck._onHashChange();
      assert.isTrue(tvDeck.buttonGroupPanel.classList.contains('hidden'));
    });

    test('channelPanel should be visible', function() {
      tvDeck._onHashChange();
      assert.isFalse(tvDeck.channelPanel.classList.contains('hidden'));
    });
  });

  suite('setHash()', function() {
    test('_onHashChange should not be called if new hash is different from ' +
         'current location.hash', function() {
      var onHashChange = this.sinon.stub(tvDeck, '_onHashChange');
      tvDeck.setHash();
      assert.isFalse(onHashChange.called);
    });

    test('_onHashChange should be called if new hash is the same as current ' +
         'location.hash', function() {
      var onHashChange = this.sinon.stub(tvDeck, '_onHashChange');
      window.location.hash = 'hash';
      tvDeck.channelManager.currentHash = '#hash';
      tvDeck.setHash();
      assert.isTrue(onHashChange.called);
    });

    test('window.location.hash should equals to currentHash', function() {
      tvDeck.channelManager.currentHash = '#new-hash';
      tvDeck.setHash();
      assert.equal(window.location.hash, '#new-hash');
    });
  });

  suite('_onSwitch()', function() {
    test('switchChannel chould be called', function() {
      var switchChannel =
                this.sinon.stub(tvDeck.channelManager, 'switchChannel');
      tvDeck._onSwitch('up');
      assert.isTrue(switchChannel.called);
    });
  });

  suite('_onEnterNumber()', function() {
    var evt;
    setup(function() {
      evt = {
        keyCode: 50
      };
      tvDeck.channelNumber.textContent = '';
    });

    teardown(function() {
      tvDeck.channelNumber.textContent = '';
    });

    test('enterNumberTimeoutId should be reassigned', function() {
      var id = tvDeck.enterNumberTimeoutId;
      tvDeck._onEnterNumber(evt);
      assert.notEqual(id, tvDeck.enterNumberTimeoutId);
    });

    test('channelPanel should be visible', function() {
      tvDeck._onEnterNumber(evt);
      assert.isFalse(tvDeck.channelPanel.classList.contains('hidden'));
    });

    test('Input number should be appended to channelNumber', function() {
      tvDeck.enterNumberTimeoutId = 1;
      tvDeck._onEnterNumber(evt);
      assert.equal(tvDeck.channelNumber.textContent, '2');
    });

    test('Input number should not be appended to channelNumber if length of ' +
         'channelNumber is greater than 4', function() {
      tvDeck.enterNumberTimeoutId = 1;
      tvDeck.channelNumber.textContent = '1234';
      tvDeck._onEnterNumber(evt);
      assert.equal(tvDeck.channelNumber.textContent, '1234');
    });
  });

  suite('_onEnter()', function() {
    setup(function() {
      this.sinon.stub(tvDeck.channelManager, 'getSource').returns({
        channelIndexHash: {
          '1-1': 5
        }
      });
    });

    test('setHash should not be called if enterNumberTimeoutId is null',
      function() {
        var setHash = this.sinon.stub(tvDeck, 'setHash');
        tvDeck._onEnter();
        assert.isFalse(setHash.called);
    });

    test('setHash should be called if enterNumberTimeoutId is defined, and ' +
         'new channel number is valid', function() {
        var setHash = this.sinon.stub(tvDeck, 'setHash');
        tvDeck.channelNumber.textContent = '1-1';
        tvDeck.enterNumberTimeoutId = 1;
        tvDeck._onEnter();
        assert.isTrue(setHash.called);
    });
  });

  suite('_showErrorState()', function() {
    test('_updateChannelInfo should be called', function() {
      var updateChannelInfo = this.sinon.stub(tvDeck, '_updateChannelInfo');
      tvDeck._showErrorState();
      assert.isTrue(updateChannelInfo.called);
    });

    test('src of video element should be remove', function() {
      this.sinon.stub(tvDeck, '_updateChannelInfo');
      tvDeck._showErrorState();
      assert.isDefined(tvDeck.tvStreamElement.src);
    });
  });

  suite('_rotateLoadingIcon()', function() {
    test('loadingIcon contains loading-circle class', function() {
      tvDeck._rotateLoadingIcon();
      assert.isTrue(tvDeck.loadingIcon.classList.contains('loading-circle'));
    });
  });

  suite('_onPanelTimeout()', function() {
    test('buttonGroupPanel should be hidden', function() {
      tvDeck._onPanelTimeout();
      assert.isTrue(tvDeck.buttonGroupPanel.classList.contains('hidden'));
    });

    test('channelPanel should be hidden', function() {
      tvDeck._onPanelTimeout();
      assert.isTrue(tvDeck.channelPanel.classList.contains('hidden'));
    });

    test('panelTimeoutId should be cleared', function() {
      tvDeck._onPanelTimeout();
      assert.isNull(tvDeck.panelTimeoutId);
    });
  });

  suite('updatePinButton()', function() {
    var _pinToHome;
    var _unpinFromHome;

    setup(function() {
      _pinToHome = this.sinon.stub(tvDeck, '_pinToHome');
      _unpinFromHome = this.sinon.stub(tvDeck, '_unpinFromHome');
    });

    test('_pinToHome should be called if cuurent channel is not pinned yet.',
      function() {
        tvDeck.pinCard.pinnedChannels = {
          '#t1,s1,c1': true
        };
        tvDeck.channelManager.currentHash = '#t1,s1,c2';
        tvDeck.updatePinButton();
        tvDeck.pinButton.click();
        assert.isTrue(_pinToHome.called);
    });

    test('_unpinFromHome should be called if cuurent channel is pinned.',
      function() {
        tvDeck.pinCard.pinnedChannels = {
          '#t1,s1,c1': true
        };
        tvDeck.channelManager.currentHash = '#t1,s1,c1';
        tvDeck.updatePinButton();
        tvDeck.pinButton.click();
        assert.isTrue(_unpinFromHome.called);
    });
  });
});
