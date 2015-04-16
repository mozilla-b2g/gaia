/* global MocksHelper, MockAppWindowManager, MockL10n,
   MediaPlaybackWidget, Service */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/js/service.js');

var mocksForMediaPlayback = new MocksHelper([
  'AppWindowManager'
]).init();

suite('system/media playback widget', function() {
  mocksForMediaPlayback.attachTestHelpers();
  var realL10n, realAppWindowManager;
  var widget;

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realAppWindowManager = window.appWindowManager;
    window.appWindowManager = new MockAppWindowManager();
    requireApp('system/js/media_playback.js', function() {
      widget = new MediaPlaybackWidget(
        document.getElementById('media-playback-container'),
        {nowPlayingAction: 'openapp'}
      );
      widget.origin = null;
      done();
    });
  });

  suiteTeardown(function() {
    window.appWindowManager = realAppWindowManager;
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  suite('handleMessage', function() {
    var stubAppInfo, stubNowPlaying, stubPlaybackStatus;

    function sendMediaCommsIAC(message) {
      var evt = new CustomEvent('iac-mediacomms', { detail: message });
      window.dispatchEvent(evt);
    }

    setup(function() {
      stubAppInfo = this.sinon.stub(widget, 'updateAppInfo');
      stubNowPlaying = this.sinon.stub(widget, 'updateNowPlaying');
      stubPlaybackStatus = this.sinon.stub(widget, 'updatePlaybackStatus');
    });

    test('updateAppInfo', function() {
      sendMediaCommsIAC({ type: 'appinfo', data: 'appinfo-data' });
      assert.isTrue(stubAppInfo.calledOnce);
      assert.isTrue(stubAppInfo.calledWith('appinfo-data'));
    });

    test('updateNowPlaying', function() {
      sendMediaCommsIAC({ type: 'nowplaying', data: 'nowplaying-data' });
      assert.isTrue(stubNowPlaying.calledOnce);
      assert.isTrue(stubNowPlaying.calledWith('nowplaying-data'));
    });

    test('updatePlaybackStatus', function() {
      sendMediaCommsIAC({ type: 'status', data: 'status-data' });
      assert.isTrue(stubPlaybackStatus.calledOnce);
      assert.isTrue(stubPlaybackStatus.calledWith('status-data'));
    });
  });

  suite('updateAppInfo', function() {
    teardown(function() {
      widget.origin = null;
    });

    test('Do nothing if no app info provided', function() {
      widget.updateAppInfo();
      assert.isNull(widget.origin);
    });

    test('Update app info', function() {
      var info = { origin: 'origin' };
      widget.updateAppInfo(info);
      assert.equal(widget.origin, info.origin);
    });
  });

  suite('updateNowPlaying', function() {
    teardown(function() {
      widget.track.textContent = '';
    });

    test('Do nothing if no metadata provided', function() {
      widget.updateNowPlaying();
      assert.equal(widget.track.textContent, '');
    });

    test('Update now playing', function() {
      var metadata = { title: 'title', artist: 'artist' };
      widget.updateNowPlaying(metadata);
      assert.equal(widget.track.textContent, 'title — artist');
      assert.equal(widget.track.innerHTML,
                   '<bdi>title</bdi> — <bdi>artist</bdi>');
    });
  });

  suite('updatePlaybackStatus', function() {
    test('play', function() {
      widget.updatePlaybackStatus({ playStatus: 'PLAYING' });
      assert.isFalse(widget.hidden);
      assert.equal(widget.playPauseButton.dataset.icon, 'pause');
    });

    test('pause', function() {
      widget.updatePlaybackStatus({ playStatus: 'PAUSED' });
      assert.isFalse(widget.hidden);
      assert.equal(widget.playPauseButton.dataset.icon, 'play');
    });

    test('stop', function() {
      widget.updatePlaybackStatus({ playStatus: 'STOPPED' });
      assert.isTrue(widget.hidden);
    });

    test('mozinterruptbegin', function() {
      widget.updatePlaybackStatus({ playStatus: 'mozinterruptbegin' });
      assert.isTrue(widget.hidden);
    });
  });

  suite('openMediaApp', function() {
    var stubDispatchEvent;

    setup(function() {
      stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
    });

    teardown(function() {
      widget.origin = null;
    });

    test('Do nothing if no app origin', function() {
      widget.openMediaApp();
      assert.isFalse(stubDispatchEvent.called);
    });

    test('Open media app', function() {
      widget.origin = 'app://www.fake';
      widget.openMediaApp();
      assert.isTrue(stubDispatchEvent.called);
    });
  });

  suite('handleContextmenu', function() {
    var stubSendCommand;

    setup(function() {
      stubSendCommand = this.sinon.stub(widget, 'sendCommand');
    });

    teardown(function() {
      widget.isFastSeeking = false;
    });

    test('handleContextmenu - rewind start', function() {
      var event = { target: widget.previousButton };
      widget.handleContextmenu(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('rewindstart'));
      assert.isTrue(widget.isFastSeeking);
    });

    test('handleContextmenu - fastforward start', function() {
      var event = { target: widget.nextButton };
      widget.handleContextmenu(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('fastforwardstart'));
      assert.isTrue(widget.isFastSeeking);
    });
  });

  suite('handleTouchend', function() {
    var stubSendCommand;

    setup(function() {
      stubSendCommand = this.sinon.stub(widget, 'sendCommand');
    });

    test('handleTouchend - previous track', function() {
      var event = { target: widget.previousButton };
      widget.handleTouchend(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('prevtrack'));
    });

    test('handleTouchend - next track', function() {
      var event = { target: widget.nextButton };
      widget.handleTouchend(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('nexttrack'));
    });

    test('handleTouchend - rewind end', function() {
      var event = { target: widget.previousButton };
      widget.isFastSeeking = true;
      widget.handleTouchend(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('rewindend'));
      assert.isFalse(widget.isFastSeeking);
    });

    test('handleTouchend - fastforward end', function() {
      var event = { target: widget.nextButton };
      widget.isFastSeeking = true;
      widget.handleTouchend(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('fastforwardend'));
      assert.isFalse(widget.isFastSeeking);
    });

    test('handleTouchend - play pause', function() {
      var event = { target: widget.playPauseButton };
      widget.handleTouchend(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('playpause'));
    });
  });

  suite('handleAudioRouteChange', function() {
    var realACM, mockACM = {};
    var stubSendCommand;

    setup(function() {
      realACM = navigator.mozAudioChannelManager;
      navigator.mozAudioChannelManager = mockACM;

      stubSendCommand = this.sinon.stub(widget, 'sendCommand');
    });

    teardown(function() {
      mockACM.headphones = false;
      navigator.mozAudioChannelManager = realACM;
      widget.audioRouting = 'speaker';
    });

    test('no wired, no bluetooth, plug wired', function() {
      widget.audioRouting = 'speaker';
      mockACM.headphones = true;
      this.sinon.stub(Service, 'query').returns(false);
      var event = { target: { headphones: true } };
      var reason = 'wired';
      widget.handleAudioRouteChange(event, reason);
      assert.isTrue(!stubSendCommand.calledOnce);
      assert.equal(widget.audioRouting, 'wired');
    });

    test('no wired, no bluetooth, connect bluetooth', function() {
      widget.audioRouting = 'speaker';
      mockACM.headphones = false;
      this.sinon.stub(Service, 'query').returns(true);
      var event = { detail: { connected: true } };
      var reason = 'bluetooth';
      widget.handleAudioRouteChange(event, reason);
      assert.isTrue(!stubSendCommand.calledOnce);
      assert.equal(widget.audioRouting, 'bluetooth');
    });

    test('wired active, no bluetooth, unplug wired', function() {
      widget.audioRouting = 'wired';
      mockACM.headphones = false;
      this.sinon.stub(Service, 'query').returns(false);
      var event = { target: { headphones: false } };
      var reason = 'wired';
      widget.handleAudioRouteChange(event, reason);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('pause'));
      assert.equal(widget.audioRouting, 'speaker');
    });

    test('no wired, bluetooth active, disconnect bluetooth', function() {
      widget.audioRouting = 'bluetooth';
      mockACM.headphones = false;
      this.sinon.stub(Service, 'query').returns(false);
      var event = { detail: { connected: false } };
      var reason = 'bluetooth';
      widget.handleAudioRouteChange(event, reason);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('pause'));
      assert.equal(widget.audioRouting, 'speaker');
    });

    test('wired active, bluetooth inactive, unplug wired', function() {
      widget.audioRouting = 'wired';
      mockACM.headphones = false;
      this.sinon.stub(Service, 'query').returns(true);
      var event = { target: { headphones: false } };
      var reason = 'wired';
      widget.handleAudioRouteChange(event, reason);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('pause'));
      assert.equal(widget.audioRouting, 'bluetooth');
    });

    test('wired inactive, bluetooth active, disconnect bluetooth', function() {
      widget.audioRouting = 'bluetooth';
      mockACM.headphones = true;
      this.sinon.stub(Service, 'query').returns(false);
      var event = { detail: { connected: false } };
      var reason = 'bluetooth';
      widget.handleAudioRouteChange(event, reason);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('pause'));
      assert.equal(widget.audioRouting, 'wired');
    });

    test('wired active, bluetooth inactive, disconnect bluetooth', function() {
      widget.audioRouting = 'wired';
      mockACM.headphones = true;
      this.sinon.stub(Service, 'query').returns(false);
      var event = { detail: { connected: false } };
      var reason = 'bluetooth';
      widget.handleAudioRouteChange(event, reason);
      assert.isTrue(!stubSendCommand.calledOnce);
      assert.equal(widget.audioRouting, 'wired');
    });

    test('wired inactive, bluetooth active, unplug wired', function() {
      widget.audioRouting = 'bluetooth';
      mockACM.headphones = false;
      this.sinon.stub(Service, 'query').returns(true);
      var event = { target: { headphones: false } };
      var reason = 'wired';
      widget.handleAudioRouteChange(event, reason);
      assert.isTrue(!stubSendCommand.calledOnce);
      assert.equal(widget.audioRouting, 'bluetooth');
    });
  });
});
