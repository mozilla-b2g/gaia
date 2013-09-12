'use strict';

require('/shared/js/media/remote_controls.js');

suite('Media Remote Controls', function() {
  var mrc;

  setup(function() {
    mrc = new MediaRemoteControls();
  });
  teardown(function() {
  });

  suite('AVRCP commands', function() {
    test('AVRCP.PLAY_PRESS', function() {
      var playListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.PLAY);
        mrc.removeCommandListener(REMOTE_CONTROLS.PLAY, playListener);
        assert.equal(mrc._commandListeners[REMOTE_CONTROLS.PLAY].length, 0);
      });
      mrc.addCommandListener(REMOTE_CONTROLS.PLAY, playListener);
      mrc._commandHandler(AVRCP.PLAY_PRESS);
      assert.ok(playListener.calledOnce);
    });
    test('AVRCP.PLAY_PAUSE_PRESS', function() {
      var playpauseListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.PLAY_PAUSE);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.PLAY_PAUSE, playpauseListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.PLAY_PAUSE].length, 0
        );
      });
      mrc.addCommandListener(REMOTE_CONTROLS.PLAY_PAUSE, playpauseListener);
      mrc._commandHandler(AVRCP.PLAY_PAUSE_PRESS);
      assert.ok(playpauseListener.calledOnce);
    });
    test('AVRCP.PAUSE_PRESS', function() {
      var pauseListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.PAUSE);
        mrc.removeCommandListener(REMOTE_CONTROLS.PAUSE, pauseListener);
        assert.equal(mrc._commandListeners[REMOTE_CONTROLS.PAUSE].length, 0);
      });
      mrc.addCommandListener(REMOTE_CONTROLS.PAUSE, pauseListener);
      mrc._commandHandler(AVRCP.PAUSE_PRESS);
      assert.ok(pauseListener.calledOnce);
    });
    test('AVRCP.STOP_PRESS', function() {
      var stopListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.STOP);
        mrc.removeCommandListener(REMOTE_CONTROLS.STOP, stopListener);
        assert.equal(mrc._commandListeners[REMOTE_CONTROLS.STOP].length, 0);
      });
      mrc.addCommandListener(REMOTE_CONTROLS.STOP, stopListener);
      mrc._commandHandler(AVRCP.STOP_PRESS);
      assert.ok(stopListener.calledOnce);
    });
    test('AVRCP.NEXT_PRESS', function() {
      var nextListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.NEXT);
        mrc.removeCommandListener(REMOTE_CONTROLS.NEXT, nextListener);
        assert.equal(mrc._commandListeners[REMOTE_CONTROLS.NEXT].length, 0);
      });
      mrc.addCommandListener(REMOTE_CONTROLS.NEXT, nextListener);
      mrc._commandHandler(AVRCP.NEXT_PRESS);
      assert.ok(nextListener.calledOnce);
    });
    test('AVRCP.PREVIOUS_PRESS', function() {
      var previousListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.PREVIOUS);
        mrc.removeCommandListener(REMOTE_CONTROLS.PREVIOUS, previousListener);
        assert.equal(mrc._commandListeners[REMOTE_CONTROLS.PREVIOUS].length, 0);
      });
      mrc.addCommandListener(REMOTE_CONTROLS.PREVIOUS, previousListener);
      mrc._commandHandler(AVRCP.PREVIOUS_PRESS);
      assert.ok(previousListener.calledOnce);
    });
    test('AVRCP.FAST_FORWARD_PRESS', function() {
      var seekpressListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        var direction = event.detail.direction;
        console.log(command + ': ' + direction);
        assert.equal(command, REMOTE_CONTROLS.SEEK_PRESS);
        assert.strictEqual(direction, 1);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.SEEK_PRESS, seekpressListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.SEEK_PRESS].length, 0
        );
      });
      mrc.addCommandListener(REMOTE_CONTROLS.SEEK_PRESS, seekpressListener);
      mrc._commandHandler(AVRCP.FAST_FORWARD_PRESS);
      assert.ok(seekpressListener.calledOnce);
    });
    test('AVRCP.REWIND_PRESS', function() {
      var seekpressListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        var direction = event.detail.direction;
        console.log(command + ': ' + direction);
        assert.equal(command, REMOTE_CONTROLS.SEEK_PRESS);
        assert.strictEqual(direction, -1);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.SEEK_PRESS, seekpressListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.SEEK_PRESS].length, 0
        );
      });
      mrc.addCommandListener(REMOTE_CONTROLS.SEEK_PRESS, seekpressListener);
      mrc._commandHandler(AVRCP.REWIND_PRESS);
      assert.ok(seekpressListener.calledOnce);
    });
    test('AVRCP.FAST_FORWARD_RELEASE', function() {
      var seekreleaseListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.SEEK_RELEASE);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.SEEK_RELEASE, seekreleaseListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.SEEK_RELEASE].length, 0
        );
      });
      mrc.addCommandListener(REMOTE_CONTROLS.SEEK_RELEASE, seekreleaseListener);
      mrc._commandHandler(AVRCP.FAST_FORWARD_RELEASE);
      assert.ok(seekreleaseListener.calledOnce);
    });
    test('AVRCP.REWIND_RELEASE', function() {
      var seekreleaseListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.SEEK_RELEASE);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.SEEK_RELEASE, seekreleaseListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.SEEK_RELEASE].length, 0
        );
      });
      mrc.addCommandListener(REMOTE_CONTROLS.SEEK_RELEASE, seekreleaseListener);
      mrc._commandHandler(AVRCP.REWIND_RELEASE);
      assert.ok(seekreleaseListener.calledOnce);
    });
  });

  suite('IAC commands', function() {
    test('IAC.PLAY_PRESS', function() {
      var playListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.PLAY);
        mrc.removeCommandListener(REMOTE_CONTROLS.PLAY, playListener);
        assert.equal(mrc._commandListeners[REMOTE_CONTROLS.PLAY].length, 0);
      });
      mrc.addCommandListener(REMOTE_CONTROLS.PLAY, playListener);
      mrc._commandHandler(IAC.PLAY_PRESS);
      assert.ok(playListener.calledOnce);
    });
    test('IAC.PLAY_PAUSE_PRESS', function() {
      var playpauseListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.PLAY_PAUSE);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.PLAY_PAUSE, playpauseListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.PLAY_PAUSE].length, 0
        );
      });
      mrc.addCommandListener(REMOTE_CONTROLS.PLAY_PAUSE, playpauseListener);
      mrc._commandHandler(IAC.PLAY_PAUSE_PRESS);
      assert.ok(playpauseListener.calledOnce);
    });
    test('IAC.PAUSE_PRESS', function() {
      var pauseListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.PAUSE);
        mrc.removeCommandListener(REMOTE_CONTROLS.PAUSE, pauseListener);
        assert.equal(mrc._commandListeners[REMOTE_CONTROLS.PAUSE].length, 0);
      });
      mrc.addCommandListener(REMOTE_CONTROLS.PAUSE, pauseListener);
      mrc._commandHandler(IAC.PAUSE_PRESS);
      assert.ok(pauseListener.calledOnce);
    });
    test('IAC.STOP_PRESS', function() {
      var stopListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.STOP);
        mrc.removeCommandListener(REMOTE_CONTROLS.STOP, stopListener);
        assert.equal(mrc._commandListeners[REMOTE_CONTROLS.STOP].length, 0);
      });
      mrc.addCommandListener(REMOTE_CONTROLS.STOP, stopListener);
      mrc._commandHandler(IAC.STOP_PRESS);
      assert.ok(stopListener.calledOnce);
    });
    test('IAC.NEXT_PRESS', function() {
      var nextListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.NEXT);
        mrc.removeCommandListener(REMOTE_CONTROLS.NEXT, nextListener);
        assert.equal(mrc._commandListeners[REMOTE_CONTROLS.NEXT].length, 0);
      });
      mrc.addCommandListener(REMOTE_CONTROLS.NEXT, nextListener);
      mrc._commandHandler(IAC.NEXT_PRESS);
      assert.ok(nextListener.calledOnce);
    });
    test('IAC.PREVIOUS_PRESS', function() {
      var previousListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.PREVIOUS);
        mrc.removeCommandListener(REMOTE_CONTROLS.PREVIOUS, previousListener);
        assert.equal(mrc._commandListeners[REMOTE_CONTROLS.PREVIOUS].length, 0);
      });
      mrc.addCommandListener(REMOTE_CONTROLS.PREVIOUS, previousListener);
      mrc._commandHandler(IAC.PREVIOUS_PRESS);
      assert.ok(previousListener.calledOnce);
    });
    test('IAC.FAST_FORWARD_PRESS', function() {
      var seekpressListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        var direction = event.detail.direction;
        console.log(command + ': ' + direction);
        assert.equal(command, REMOTE_CONTROLS.SEEK_PRESS);
        assert.strictEqual(direction, 1);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.SEEK_PRESS, seekpressListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.SEEK_PRESS].length, 0
        );
      });
      mrc.addCommandListener(REMOTE_CONTROLS.SEEK_PRESS, seekpressListener);
      mrc._commandHandler(IAC.FAST_FORWARD_PRESS);
      assert.ok(seekpressListener.calledOnce);
    });
    test('IAC.REWIND_PRESS', function() {
      var seekpressListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        var direction = event.detail.direction;
        console.log(command + ': ' + direction);
        assert.equal(command, REMOTE_CONTROLS.SEEK_PRESS);
        assert.strictEqual(direction, -1);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.SEEK_PRESS, seekpressListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.SEEK_PRESS].length, 0
        );
      });
      mrc.addCommandListener(REMOTE_CONTROLS.SEEK_PRESS, seekpressListener);
      mrc._commandHandler(IAC.REWIND_PRESS);
      assert.ok(seekpressListener.calledOnce);
    });
    test('IAC.FAST_FORWARD_RELEASE', function() {
      var seekreleaseListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.SEEK_RELEASE);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.SEEK_RELEASE, seekreleaseListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.SEEK_RELEASE].length, 0
        );
      });
      mrc.addCommandListener(REMOTE_CONTROLS.SEEK_RELEASE, seekreleaseListener);
      mrc._commandHandler(IAC.FAST_FORWARD_RELEASE);
      assert.ok(seekreleaseListener.calledOnce);
    });
    test('IAC.REWIND_RELEASE', function() {
      var seekreleaseListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.SEEK_RELEASE);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.SEEK_RELEASE, seekreleaseListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.SEEK_RELEASE].length, 0
        );
      });
      mrc.addCommandListener(REMOTE_CONTROLS.SEEK_RELEASE, seekreleaseListener);
      mrc._commandHandler(IAC.REWIND_RELEASE);
      assert.ok(seekreleaseListener.calledOnce);
    });
  });

  suite('UPDATE commands', function() {
    test('REMOTE_CONTROLS.UPDATE_METADATA', function() {
      var updatemetadataListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.UPDATE_METADATA);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.UPDATE_METADATA, updatemetadataListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.UPDATE_METADATA].length, 0
        );
      });
      mrc.addCommandListener(
        REMOTE_CONTROLS.UPDATE_METADATA, updatemetadataListener
      );
      mrc._commandHandler(REMOTE_CONTROLS.UPDATE_METADATA);
      assert.ok(updatemetadataListener.calledOnce);
    });
    test('REMOTE_CONTROLS.UPDATE_PLAYSTATUS', function() {
      var updateplaystatusListener = this.sinon.spy(function(event) {
        var command = event.detail.command;
        console.log(command);
        assert.equal(command, REMOTE_CONTROLS.UPDATE_PLAYSTATUS);
        mrc.removeCommandListener(
          REMOTE_CONTROLS.UPDATE_PLAYSTATUS, updateplaystatusListener
        );
        assert.equal(
          mrc._commandListeners[REMOTE_CONTROLS.UPDATE_PLAYSTATUS].length, 0
        );
      });
      mrc.addCommandListener(
        REMOTE_CONTROLS.UPDATE_PLAYSTATUS, updateplaystatusListener
      );
      mrc._commandHandler(REMOTE_CONTROLS.UPDATE_PLAYSTATUS);
      assert.ok(updateplaystatusListener.calledOnce);
    });
  });
});
