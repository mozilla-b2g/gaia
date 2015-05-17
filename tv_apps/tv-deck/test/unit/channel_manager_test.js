'use strict';
/*jshint browser: true */
/* global ChannelManager, MocksHelper, MockTVManager, MockTVTuner,
          MockTVSource */

require('/bower_components/evt/index.js');
require('/shared/js/async_storage.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/shared/test/unit/mocks/mock_tv_channel.js');
require('/shared/test/unit/mocks/mock_tv_source.js');
require('/shared/test/unit/mocks/mock_tv_tuner.js');
require('/shared/test/unit/mocks/mock_tv_manager.js');
require('/js/channel_manager.js');

var mocksHelper = new MocksHelper([
  'Promise'
]).init();

suite('tv-deck/channel_manager', function() {

  var realTVManager;
  var channelManager;

  mocksHelper.attachTestHelpers();

  setup(function() {
    realTVManager = window.navigator.tv;
    window.navigator.tv = new MockTVManager();
    channelManager = new ChannelManager();
  });

  teardown(function() {
    window.asyncStorage.removeItem('TV_Hash');
  });

  suite('getTuner()', function() {
    setup(function() {
      channelManager.currentTuners = {
        'tuner1': {},
        'tuner2': {}
      };

      channelManager.playingState = {
        tunerId: 'tuner1',
        sourceType: 'source1',
        channelNumber: 'channel1'
      };
    });

    test('Default value should be set to playingState.tunerId', function() {
      var tuner = channelManager.currentTuners.tuner1;
      assert.equal(channelManager.getTuner(), tuner);
    });

    test('tuner2 should be found in currentTuners', function() {
      var tuner = channelManager.currentTuners.tuner2;
      assert.equal(channelManager.getTuner('tuner2'), tuner);
    });
  });

  suite('getSource()', function() {
    setup(function() {
      channelManager.currentTuners = {
        'tuner1': {
          sources: {
            'source1': {},
            'source2': {}
          }
        }
      };

      channelManager.playingState = {
        tunerId: 'tuner1',
        sourceType: 'source1',
        channelNumber: 'channel1'
      };
    });

    test('Default value should be set to playingState.sourceType', function() {
      var source = channelManager.currentTuners.tuner1.sources.source1;
      assert.equal(channelManager.getSource(), source);
    });

    test('source2 should be found in currentTuners', function() {
      var source = channelManager.currentTuners.tuner1.sources.source2;
      assert.equal(channelManager.getSource('source2'), source);
    });
  });

  suite('getChannel()', function() {
    setup(function() {
      channelManager.currentTuners = {
        'tuner1': {
          sources: {
            'source1': {
              channels: [{}, {}],
              channelIndexHash: {
                'channel1': 0,
                'channel2': 1
              }
            }
          }
        }
      };

      channelManager.playingState = {
        tunerId: 'tuner1',
        sourceType: 'source1',
        channelNumber: 'channel1'
      };
    });

    test('Default value should be set to playingState.channelNumber',
      function() {
        var source = channelManager.currentTuners.tuner1.sources.source1;
        var channel = source.channels[0];
        assert.equal(channelManager.getChannel(), channel);
    });

    test('channel2 should be found in currentTuners with index 1', function() {
      var source = channelManager.currentTuners.tuner1.sources.source1;
      var channel = source.channels[1];
      assert.equal(channelManager.getChannel('channel2'), channel);
    });
  });

  suite('fetchSettingFromHash()', function() {
    setup(function(done) {
      window.asyncStorage.setItem('TV_Hash', '#t1,s1,c1', function() {
        done();
      });
    });

    test('playingState should be set to the same setting as input arguement',
      function(done) {
        var hash = '#t0,s0,c0';
        var promise = channelManager.fetchSettingFromHash(hash);
        promise.mExecuteCallback(function() {
          assert.equal(channelManager.playingState.tunerId, 't0');
          assert.equal(channelManager.playingState.sourceType, 's0');
          assert.equal(channelManager.playingState.channelNumber, 'c0');
          done();
        });
    });

    test('playingState should be set to the same setting in asyncStorage',
      function(done) {
        var promise = channelManager.fetchSettingFromHash();
        promise.mExecuteCallback(function() {
          assert.equal(channelManager.playingState.tunerId, 't1');
          assert.equal(channelManager.playingState.sourceType, 's1');
          assert.equal(channelManager.playingState.channelNumber, 'c1');
          done();
        });
    });
  });

  suite('scanTuners()', function() {
    var scanSources;
    var fire;
    var tuners;

    function setTuners() {
      tuners = [];
      tuners[0] = new MockTVTuner();
      tuners[0].id = 'tuner-0';
      tuners[1] = new MockTVTuner();
      tuners[1].id = 'tuner-1';
    }

    setup(function() {
      setTuners();
      this.sinon.stub(navigator.tv, 'getTuners').returns({
        then: function(callback) {
          callback(tuners);
        }
      });
      fire = this.sinon.stub(channelManager, 'fire');
      scanSources = this.sinon.stub(channelManager, 'scanSources');
    });

    test('playingState.tunerId should be set to first tuner by default if it' +
      'is null value', function() {
      channelManager.scanTuners();
      assert.equal(channelManager.playingState.tunerId, 'tuner-0');
    });

    test('scanSources should be called if tuner can be found', function() {
        channelManager.scanTuners();
        assert.isTrue(scanSources.called);
    });

    test('error should be fired if tuner cannot be found', function() {
        channelManager.playingState.tunerId = 'null';
        channelManager.scanTuners();
        assert.isTrue(fire.called);
    });
  });

  suite('scanSources()', function() {
    var scanChannels;
    var fire;
    var tunerObject;

    setup(function() {
      tunerObject = {
        tuner: new MockTVTuner()
      };

      this.sinon.stub(channelManager, 'getTuner').returns(tunerObject);
      fire = this.sinon.stub(channelManager, 'fire');
      scanChannels = this.sinon.stub(channelManager, 'scanChannels');
    });

    test('playingState.sourceType should be set to first source by default if' +
      'it is null value', function() {
      channelManager.scanSources();
      assert.equal(channelManager.playingState.sourceType, 'dvb-0');
    });

    test('scanChannels should be called if tuner can be found', function() {
        channelManager.scanSources();
        assert.isTrue(scanChannels.called);
    });

    test('error should be fired if tuner cannot be found', function() {
        channelManager.playingState.sourceType = 'null';
        channelManager.scanSources();
        assert.isTrue(fire.called);
    });
  });

  suite('scanChannels()', function() {
    var fire;
    var sourceObject;

    setup(function() {
      sourceObject = {
        source: new MockTVSource()
      };

      this.sinon.stub(channelManager, 'getSource').returns(sourceObject);
      fire = this.sinon.stub(channelManager, 'fire');
    });

    test('playingState.sourceType should be set to first source by default if' +
      'it is null value', function() {
      channelManager.scanChannels();
      assert.equal(channelManager.playingState.channelNumber, '0');
    });

    test('isReady is set to be true', function() {
      channelManager.scanChannels();
      assert.isTrue(channelManager.isReady);
    });

    test('error should be fired if tuner cannot be found', function() {
      channelManager.playingState.channelNumber = 'null';
      channelManager.scanChannels();
      assert.isTrue(fire.called);
    });
  });

  suite('setPlayingSource()', function() {
    var tunerObject;
    var sourceObject;
    var setPlayingChannel;
    var setCurrentSource;

    setup(function() {
      tunerObject = {
        tuner: new MockTVTuner()
      };
      sourceObject = {
        source: new MockTVSource()
      };
      this.sinon.stub(channelManager, 'getTuner').returns(tunerObject);
      this.sinon.stub(channelManager, 'getSource').returns(sourceObject);
      setPlayingChannel = this.sinon.stub(channelManager, 'setPlayingChannel');
      setCurrentSource = this.sinon.stub(tunerObject.tuner, 'setCurrentSource');
      setCurrentSource.returns({
        then: function(callback) {
          callback();
        }
      });
    });

    test('If currentSource in playing tuner is the same as playing source, ' +
      'setPlayingChannel should be called while setCurrentSource should not',
      function() {
        tunerObject.tuner.currentSource = sourceObject.source;
        channelManager.setPlayingSource();
        assert.isTrue(setPlayingChannel.called);
        assert.isFalse(setCurrentSource.called);
    });

    test('If currentSource in playing tuner is not the same as playing source' +
      ', setPlayingChannel and setCurrentSource should both be called',
      function() {
        tunerObject.tuner.currentSource = new MockTVSource();
        channelManager.setPlayingSource();
        assert.isTrue(setPlayingChannel.called);
        assert.isTrue(setCurrentSource.called);
    });
  });

  suite('setPlayingChannel()', function() {
    var sourceObject;
    var setCurrentChannel;
    setup(function() {
      sourceObject = {
        source: new MockTVSource()
      };
      this.sinon.stub(channelManager, 'getSource').returns(sourceObject);
      setCurrentChannel =
                    this.sinon.stub(sourceObject.source, 'setCurrentChannel');
      setCurrentChannel.returns({
        then: function(callback) {
          callback();
        }
      });
    });

    test('setCurrentChannel should be not called if source is scanning',
      function() {
        sourceObject.source.isScanning = true;
        channelManager.setPlayingChannel();
        assert.isFalse(setCurrentChannel.called);
    });

    test('callback should be not called if source is scanning', function() {
      var callback = this.sinon.stub();
      sourceObject.source.isScanning = true;
      channelManager.setPlayingChannel(callback);
      assert.isTrue(callback.called);
    });

    test('Both setCurrentChannel and callback should be called if source is' +
      'not scanning', function() {
      var callback = this.sinon.stub();
      sourceObject.source.isScanning = false;
      channelManager.setPlayingChannel(callback);
      assert.isTrue(setCurrentChannel.called);
      assert.isTrue(callback.called);
    });
  });

  suite('switchChannel()', function() {
    setup(function() {
      this.sinon.stub(channelManager, 'getChannel').returns({});
      this.sinon.stub(channelManager, 'getSource').returns({
        channels: [{
          channel: {
            number: '0'
          }
        }, {
          channel: {
            number: '1'
          }
        }, {
          channel: {
            number: '2'
          }
        }, {
          channel: {
            number: '3'
          }
        }, {
          channel: {
            number: '4'
          }
        }],
        channelIndexHash: {
          '0': 0,
          '1': 1,
          '2': 2,
          '3': 3,
          '4': 4
        }
      });
      channelManager.isReady = true;
      channelManager.playingState = {
        channelNumber: '0'
      };
    });

    test('Switch up channel, channelNumber should be 1', function() {
      channelManager.switchChannel('up');
      assert.equal(channelManager.playingState.channelNumber, '1');
    });

    test('Switch down channel, channelNumber should be 4', function() {
      channelManager.switchChannel('down');
    });
  });
});
