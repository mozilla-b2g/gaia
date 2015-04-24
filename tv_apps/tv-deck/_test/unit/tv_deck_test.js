'use strict';
/*jshint browser: true */
/* global TVDeck, MocksHelper, MockTVManager, MockTVTuner, MockTVSource */
/* global MockTVChannel */

require('/shared/test/unit/mocks/mock_key_navigation_adapter.js');
require('/shared/test/unit/mocks/mock_simple_key_navigation.js');
require('/shared/test/unit/mocks/mock_tv_channel.js');
require('/shared/test/unit/mocks/mock_tv_source.js');
require('/shared/test/unit/mocks/mock_tv_tuner.js');
require('/shared/test/unit/mocks/mock_tv_manager.js');
require('/bower_components/smart-bubbles/script.js');
require('/test/unit/mock_channel_manager.js');

var mocksHelper = new MocksHelper([
  'ChannelManager',
  'KeyNavigationAdapter',
  'SimpleKeyNavigation'
]).init();

suite('tv-deck/tv_deck', function() {

  var tvDeck;
  var realTVManager;

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

  suiteSetup(function(done) {
    createMockUI();
    sinon.stub(window, 'addEventListener');

    require('/js/tv_deck.js', done);
  });

  suite('Constructor', function() {
    setup(function() {
      window.location.hash = '';
      window.localStorage.removeItem('TV_Hash');
      realTVManager = window.navigator.tv;
      window.navigator.tv = new MockTVManager();
    });

    teardown(function() {
      window.navigator.tv = realTVManager;
    });

    test('fetchSettingFromHash should be called', function() {
      var fetchSettingFromHash =
                    this.sinon.stub(TVDeck.prototype, 'fetchSettingFromHash');
      tvDeck = new TVDeck();
      assert.isTrue(fetchSettingFromHash.called);
    });

    test('scanTuners should be called', function() {
      var scanTuners = this.sinon.stub(TVDeck.prototype, 'scanTuners');
      tvDeck = new TVDeck();
      assert.isTrue(scanTuners.called);
    });
  });

  suite('fetchSettingFromHash', function() {
    setup(function() {
      window.location.hash = '';
      window.localStorage.removeItem('TV_Hash');
      window.navigator.tv = new MockTVManager();
      tvDeck = new TVDeck();
    });

    teardown(function() {
      window.navigator.tv = realTVManager;
    });

    test('Fetch with URL hash', function() {
      window.location.hash = 'AAA,BBB,CCC';
      tvDeck.fetchSettingFromHash();
      assert.equal(tvDeck.playingTunerId, 'AAA');
      assert.equal(tvDeck.playingSourceType, 'BBB');
      assert.equal(tvDeck.playingChannelNumber, 'CCC');
    });

    test('Fetch with localStorage', function() {
      window.location.hash = '';
      window.localStorage.setItem('TV_Hash', 'AAA,BBB,CCC');
      tvDeck.fetchSettingFromHash();
      assert.equal(tvDeck.playingTunerId, 'AAA');
      assert.equal(tvDeck.playingSourceType, 'BBB');
      assert.equal(tvDeck.playingChannelNumber, 'CCC');
    });
  });

  suite('_onHashChange', function() {
    setup(function() {
      window.location.hash = '';
      window.localStorage.removeItem('TV_Hash');
      window.navigator.tv = new MockTVManager();
      tvDeck = new TVDeck();
    });

    teardown(function() {
      window.navigator.tv = realTVManager;
    });

    test('fetchSettingFromHash should be called', function() {
      window.location.hash = '1,dvb-1,3';
      var fetchSettingFromHash =
                    this.sinon.stub(tvDeck, 'fetchSettingFromHash');
      tvDeck._onHashChange();
      assert.isTrue(fetchSettingFromHash.called);
    });

    test('localStorage should have the same value as URL hash', function() {
      window.location.hash = '1,dvb-1,3';
      tvDeck._onHashChange();
      assert.equal(window.localStorage.getItem('TV_Hash'), '1,dvb-1,3');
    });

    test('Rescan tuner if tuner is not found', function() {
      window.location.hash = 'AAA,dvb-1,3';
      var scanTuners = this.sinon.stub(tvDeck, 'scanTuners');
      tvDeck._onHashChange();
      assert.isTrue(scanTuners.called);
    });

    test('Rescan source if source is not found', function() {
      window.location.hash = '1,BBB,3';
      var scanSources = this.sinon.stub(tvDeck, 'scanSources');
      tvDeck._onHashChange();
      assert.isTrue(scanSources.called);
    });

    test('Rescan channel if channel is not found', function() {
      window.location.hash = '1,dvb-1,CCC';
      var scanChannels = this.sinon.stub(tvDeck, 'scanChannels');
      tvDeck._onHashChange();
      assert.isTrue(scanChannels.called);
    });

    test('updateChannelInfo should be called', function() {
      var updateChannelInfo = this.sinon.stub(tvDeck, 'updateChannelInfo');
      tvDeck._onHashChange();
      assert.isTrue(updateChannelInfo.called);
    });

    test('setPlayingSource should be called', function() {
      var setPlayingSource = this.sinon.stub(tvDeck, 'setPlayingSource');
      tvDeck._onHashChange();
      assert.isTrue(setPlayingSource.called);
    });
  });

  suite('scanTuners', function() {
    var getTuners;
    var scanSources;
    var tuners;

    function createTuners() {
      tuners = [];

      var tuner = new MockTVTuner();
      tuner.id = 'tuner1';
      tuners.push(tuner);

      tuner = new MockTVTuner();
      tuner.id = 'tuner2';
      tuners.push(tuner);
    }

    setup(function() {
      createTuners();
      window.location.hash = '';
      window.localStorage.removeItem('TV_Hash');
      window.navigator.tv = new MockTVManager();
      tvDeck = new TVDeck();
      scanSources = this.sinon.stub(tvDeck, 'scanSources');
      getTuners = this.sinon.stub(navigator.tv, 'getTuners');
      getTuners.returns({
        then: function(callback) {
          callback(tuners);
        }
      });
    });

    teardown(function() {
      window.navigator.tv = realTVManager;
    });

    test('Should get tuners from TVManager', function() {
      tvDeck.scanTuners();
      assert.isTrue(getTuners.called);
    });

    test('currentTuners should have two tuners tuner1 and tuner2', function() {
      var tunerCount = 0;
      var tuner;
      tvDeck.currentTuners = {};
      tvDeck.scanTuners();
      for(tuner in tvDeck.currentTuners) {
        tunerCount++;
      }
      assert(tvDeck.currentTuners.tuner1);
      assert(tvDeck.currentTuners.tuner2);
      assert.equal(tunerCount, 2);
    });

    suite('Scan with empty initial playingTunerId value', function() {
      setup(function() {
        tvDeck.playingTunerId = null;
      });

      test('Should be assigned to the first tuner by default', function() {
        tvDeck.scanTuners();
        assert.equal(tvDeck.playingTunerId, 'tuner1');
      });

      test('scanSources should be called', function() {
        tvDeck.scanTuners();
        assert.isTrue(scanSources.called);
      });
    });

    suite('Scan with valid initial playingTunerId value', function() {
      setup(function() {
        tvDeck.playingTunerId = 'tuner2';
      });

      test('playingTunerId should be assigned to tuner2', function() {
        tvDeck.scanTuners();
        assert.equal(tvDeck.playingTunerId, 'tuner2');
      });

      test('scanSources should be called', function() {
        tvDeck.scanTuners();
        assert.isTrue(scanSources.called);
      });
    });

    suite('Scan with invalid initial playingTunerId value', function() {
      setup(function() {
        tvDeck.playingTunerId = 'NOT FOUND';
      });

      test('showErrorState should be called', function() {
        var showErrorState = this.sinon.stub(tvDeck, '_showErrorState');
        tvDeck.scanTuners();
        assert.isTrue(showErrorState.called);
      });

      test('scanSources should not be called', function() {
        tvDeck.scanTuners();
        assert.isFalse(scanSources.called);
      });
    });
  });

  suite('scanSources', function() {
    var getSources;
    var scanChannels;
    var sources;

    function createSources() {
      sources = [];

      var source = new MockTVSource();
      source.type = 'tnt-1';
      sources.push(source);

      source = new MockTVSource();
      source.type = 'tnt-2';
      sources.push(source);
    }

    setup(function() {
      createSources();
      window.location.hash = '';
      window.localStorage.removeItem('TV_Hash');
      window.navigator.tv = new MockTVManager();
      tvDeck = new TVDeck();
      scanChannels = this.sinon.stub(tvDeck, 'scanChannels');
      getSources = this.sinon.stub(tvDeck.playingTuner.tuner, 'getSources');
      getSources.returns({
        then: function(callback) {
          callback(sources);
        }
      });
    });

    teardown(function() {
      window.navigator.tv = realTVManager;
    });

    test('Should get sources from the given tuner', function() {
      tvDeck.scanSources();
      assert.isTrue(getSources.called);
    });

    test('Should have two sources tnt-1 and tnt-1', function() {
      var sourceCount = 0;
      var source;
      tvDeck.playingTuner.sources = {};
      tvDeck.scanTuners();
      for(source in tvDeck.playingTuner.sources) {
        sourceCount++;
      }
      assert(tvDeck.playingTuner.sources['tnt-1']);
      assert(tvDeck.playingTuner.sources['tnt-2']);
      assert.equal(sourceCount, 2);
    });

    suite('Scan with empty initial playingSourceType value', function() {
      setup(function() {
        tvDeck.playingSourceType = null;
      });

      test('Should be assigned to the first source by default', function() {
        tvDeck.scanSources();
        assert.equal(tvDeck.playingSourceType, 'tnt-1');
      });

      test('scanChannels should be called', function() {
        tvDeck.scanSources();
        assert.isTrue(scanChannels.called);
      });
    });

    suite('Scan with valid initial playingSourceType value', function() {
      setup(function() {
        tvDeck.playingSourceType = 'tnt-2';
      });

      test('Should be assigned to the source tnt-2', function() {
        tvDeck.scanSources();
        assert.equal(tvDeck.playingSourceType, 'tnt-2');
      });

      test('scanChannels should be called', function() {
        tvDeck.scanSources();
        assert.isTrue(scanChannels.called);
      });
    });

    suite('Scan with invalid initial playingSourceType value', function() {
      setup(function() {
        tvDeck.playingSourceType = 'NOT FOUND';
      });

      test('showErrorState should be called', function() {
        var showErrorState = this.sinon.stub(tvDeck, '_showErrorState');
        tvDeck.scanSources();
        assert.isTrue(showErrorState.called);
      });

      test('scanChannels should be called', function() {
        tvDeck.scanSources();
        assert.isFalse(scanChannels.called);
      });
    });
  });

  suite('scanChannels', function() {
    var startScanning;

    setup(function() {
      window.location.hash = '';
      window.localStorage.removeItem('TV_Hash');
      window.navigator.tv = new MockTVManager();
      tvDeck = new TVDeck();
      startScanning =
                this.sinon.stub(tvDeck.playingSource.source, 'startScanning');
      this.sinon.stub(tvDeck, '_onScanningCompleted');
    });

    teardown(function() {
      window.navigator.tv = realTVManager;
    });

    test('startScanning should be called', function() {
      tvDeck.scanChannels();
      assert.isTrue(startScanning.called);
    });

    test('startScanning should not be called when scanning', function() {
      tvDeck.playingSource.source.isScanning = true;
      tvDeck.scanChannels();
      assert.isFalse(startScanning.called);
    });

    test('channels in playingSource should be clear', function() {
      tvDeck.scanChannels();
      assert.equal(tvDeck.playingSource.channels.length, 0);
    });

    test('channelIndexHash in playingSource should be clear', function() {
      var count = 0;
      var index;
      tvDeck.scanChannels();
      for(index in tvDeck.playingSource.channelIndexHash) {
        count++;
      }
      assert.equal(count, 0);
    });
  });

  suite('setPlayingSource', function() {
    var setPlayingChannel;
    var setCurrentSource;

    setup(function() {
      window.location.hash = '';
      window.localStorage.removeItem('TV_Hash');
      window.navigator.tv = new MockTVManager();
      tvDeck = new TVDeck();
      setPlayingChannel = this.sinon.stub(tvDeck, 'setPlayingChannel');
      setCurrentSource =
                this.sinon.stub(tvDeck.playingTuner.tuner, 'setCurrentSource');
      setCurrentSource.returns({
        then: function() {}
      });
    });

    teardown(function() {
      window.navigator.tv = realTVManager;
    });

    test('setCurrentSource should be called when sourceType is changed',
      function() {
        var source = new MockTVSource();
        tvDeck.playingSource.source = source;
        tvDeck.setPlayingSource();
        assert.isTrue(setCurrentSource.called);
    });

    test('setPlayingChannel should be called sourceType remains the same',
      function() {
        var source = new MockTVSource();
        tvDeck.playingTuner.tuner.currentSource = source;
        tvDeck.playingSource.source = source;
        tvDeck.setPlayingSource();
        assert.isTrue(setPlayingChannel.called);
    });
  });

  suite('updateChannelInfo', function() {
    setup(function() {
      window.location.hash = '';
      window.localStorage.removeItem('TV_Hash');
      window.navigator.tv = new MockTVManager();
      tvDeck = new TVDeck();
    });

    teardown(function() {
      window.navigator.tv = realTVManager;
    });

    test('Call with input title and number', function() {
        tvDeck.updateChannelInfo('title', 'number');
        assert.equal(tvDeck.channelTitle.textContent, 'title');
        assert.equal(tvDeck.channelNumber.textContent, 'number');
    });

    test('Call without input title and name', function() {
        tvDeck.updateChannelInfo();
        assert.equal(tvDeck.channelTitle.textContent, 'name0');
        assert.equal(tvDeck.channelNumber.textContent, '0');
    });
  });

  suite('setHash', function() {
    var onHashChange;
    setup(function() {
      window.location.hash = '';
      window.localStorage.removeItem('TV_Hash');
      window.navigator.tv = new MockTVManager();
      tvDeck = new TVDeck();
      onHashChange = this.sinon.stub(tvDeck, '_onHashChange');
    });

    teardown(function() {
      window.navigator.tv = realTVManager;
    });

    test('URL hash should be set to currentHash', function() {
        tvDeck.playingTunerId = 't1';
        tvDeck.playingSourceType = 's1';
        tvDeck.playingChannelNumber = 'c1';
        tvDeck.setHash();
        assert.equal(window.location.hash, '#t1,s1,c1');
    });

    test('onHashChange should be called if URL hash equals to current hash.',
        function() {
          window.location.hash = 't1,s1,c1';
          tvDeck.playingTunerId = 't1';
          tvDeck.playingSourceType = 's1';
          tvDeck.playingChannelNumber = 'c1';
          tvDeck.setHash();
          assert.isTrue(onHashChange.called);
    });
  });

  suite('_onScanningCompleted', function() {
    var getChannels;
    var setHash;
    var channels;

    function createSources() {
      channels = [];

      var channel = new MockTVChannel();
      channel.name = 'channel1';
      channel.number = '10-3';
      channels.push(channel);

      channel = new MockTVChannel();
      channel.type = 'channel2';
      channel.number = '10';
      channels.push(channel);

      channel = new MockTVChannel();
      channel.type = 'channel3';
      channel.number = '10-2';
      channels.push(channel);

      channel = new MockTVChannel();
      channel.type = 'channel4';
      channel.number = '9';
      channels.push(channel);
    }

    setup(function() {
      createSources();
      window.location.hash = '';
      window.localStorage.removeItem('TV_Hash');
      window.navigator.tv = new MockTVManager();
      tvDeck = new TVDeck();
      setHash = this.sinon.stub(tvDeck, 'setHash');
      getChannels = this.sinon.stub(tvDeck.playingSource.source, 'getChannels');
      getChannels.returns({
        then: function(callback) {
          callback(channels);
        }
      });
    });

    teardown(function() {
      window.navigator.tv = realTVManager;
    });

    test('Should get channels from the given source', function() {
      tvDeck._onScanningCompleted();
      assert.isTrue(getChannels.called);
    });

    test('Should have four sorted channels 9, 10, 10-2 and 10-3', function() {
      var sortedChannels = ['9', '10', '10-2', '10-3'];
      tvDeck.playingSource.channels = [];
      tvDeck._onScanningCompleted();
      assert.equal(tvDeck.playingSource.channels.length, 4);
      tvDeck.playingSource.channels.forEach(function(channelObject, index) {
        assert.equal(channelObject.channel.number, sortedChannels[index]);
      });
    });

    suite('Scan with empty initial playingChannelNumber value', function() {
      setup(function() {
        tvDeck.playingChannelNumber = null;
      });

      test('Should be assigned to the first channel by default', function() {
        tvDeck._onScanningCompleted();
        assert.equal(tvDeck.playingChannelNumber, '9');
      });

      test('setHash should be called', function() {
        tvDeck._onScanningCompleted();
        assert.isTrue(setHash.called);
      });
    });

    suite('Scan with valid initial playingChannelNumber value', function() {
      setup(function() {
        tvDeck.playingChannelNumber = '10-3';
      });

      test('Should be assigned to the channel 10-3', function() {
        tvDeck._onScanningCompleted();
        assert.equal(tvDeck.playingChannelNumber, '10-3');
      });

      test('setHash should be called', function() {
        tvDeck._onScanningCompleted();
        assert.isTrue(setHash.called);
      });
    });

    suite('Scan with invalid initial playingChannelNumber value', function() {
      setup(function() {
        tvDeck.playingChannelNumber = 'NOT FOUND';
      });

      test('showErrorState should be called', function() {
        var showErrorState = this.sinon.stub(tvDeck, '_showErrorState');
        tvDeck._onScanningCompleted();
        assert.isTrue(showErrorState.called);
      });

      test('setHash should not be called', function() {
        tvDeck._onScanningCompleted();
        assert.isFalse(setHash.called);
      });
    });
  });
});
