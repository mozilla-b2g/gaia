/* global INTERRUPT_BEGIN, KeyboardEvent, KeyEvent, loadBodyHTML, MockL10n,
          MocksHelper, PlaybackQueue, PlayerView, PLAYSTATUS_PAUSED,
          PLAYSTATUS_PLAYING */

'use strict';

require('/js/ui/views/player_view.js');
require('/js/queue.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/test/unit/ui/views/mock_modemanager.js');

var mocksForPlayerViewHelper = new MocksHelper([
  'asyncStorage'
]).init();

function mockAudioElement() {
  // we need to replace the audio element
  var audioNode = document.getElementById('player-audio');
  var parent = audioNode.parentNode;
  parent.removeChild(audioNode);
  audioNode = document.createElement('div');
  audioNode.id = 'player-audio';
  audioNode.currentTime = 100;
  parent.appendChild(audioNode);
}

suite('Player View Test', function() {
  var pv, ratings;
  var realL10n = navigator.mozL10n;

  mocksForPlayerViewHelper.attachTestHelpers();

  function testRatingsAriaChecked(checkedIndex) {
    pv.setRatings(checkedIndex);
    Array.prototype.forEach.call(ratings, function(rating, index) {
      assert.equal(checkedIndex - 1 === index ? 'true' : 'false',
        rating.getAttribute('aria-checked'));
    });
  }

  suiteSetup(function(done) {
    navigator.mozL10n = MockL10n;
    //Insert the star-rating bar into the dom
    loadBodyHTML('/index.html');

    //Initialize the Player View
    pv = PlayerView;

    //Override #setSeekBar with stub to avoid excess work in init()
    sinon.stub(pv, 'setSeekBar');
    PlaybackQueue.loadSettings().then(() => {
      pv.init();
      ratings = pv.ratings;
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('#setRating accessibility', function() {
    test('aria-checked="true" when star matches star-rating. false otherwise',
      function() {
        [0, 1, 2, 3, 4, 5].forEach(testRatingsAriaChecked);
      });
  });

  suite('show info', function() {
    var spy;

    setup(function() {
      spy = this.sinon.spy(PlayerView, 'showInfo');
    });

    test('on player cover', function() {
      ['player-cover', 'player-cover-image-1',
       'player-cover-image-2'].forEach(function(id) {
         document.getElementById(id).click();
         assert.ok(spy.called,
                   'PlayerView.showInfo should be called by click on ' + id);
       });
    });

    test('on repeat', function() {
      document.getElementById('player-album-repeat').click();
      assert.ok(spy.called,
                'PlayerView.showInfo should be called by click on repeat');
    });
  });

  suite('update remote play status on audio event', function() {

    var spy;

    setup(function() {
      spy = this.sinon.spy(PlayerView, 'updateRemotePlayStatus');
    });

    function sendEventAndTest(event, status) {
      PlayerView.audio.dispatchEvent(new CustomEvent(event));
      assert.ok(spy.called);
      if (status) {
        assert.equal(PlayerView.playStatus, status);
      }
    }

    test('on play', function() {
      sendEventAndTest('play', PLAYSTATUS_PLAYING);
    });

    test('on pause', function() {
      sendEventAndTest('pause', PLAYSTATUS_PAUSED);
    });

    test('on interrupt begin', function() {
      sendEventAndTest('mozinterruptbegin', INTERRUPT_BEGIN);
    });

    test('on interrupt end', function() {
      sendEventAndTest('mozinterruptend', PLAYSTATUS_PLAYING);
    });
  });

  suite('update seekbar', function() {
    var spy;

    setup(function() {
      spy = this.sinon.spy(PlayerView, 'updateSeekBar');
    });

    test('on duration change', function() {
      PlayerView.audio.dispatchEvent(new CustomEvent('durationchange'));
      assert.ok(spy.called);
    });

    test('on timeupdate', function() {
      PlayerView.audio.dispatchEvent(new CustomEvent('timeupdate'));
      assert.ok(spy.called);
    });

    test('on visibilitychange', function() {
      window.dispatchEvent(new CustomEvent('visibilitychange'));
      assert.ok(spy.called);
    });
  });

  suite('context menu', function() {
    var spy;
    setup(function() {
      mockAudioElement();
      spy = this.sinon.spy(PlayerView, 'startFastSeeking');
    });

    function sendEvent(id) {
      var el = document.getElementById(id);
      var ev = document.createEvent('MouseEvents');
      ev.initMouseEvent('contextmenu', true, false, window, 0, 0, 0, 0, 0,
                        false, false, false, false, 2, null);
      el.dispatchEvent(ev);
    }

    test('previous button', function() {
      sendEvent('player-controls-previous');
      assert.ok(spy.called);
    });

    test('next button', function() {
      sendEvent('player-controls-next');
      assert.ok(spy.called);
    });
  });

  suite('keyboard seek', function() {
    var spy;
    setup(function() {
      mockAudioElement();
      spy = this.sinon.spy(PlayerView, 'seekAudio');
    });

    function sendEventAndTest(key) {
      PlayerView.seekSlider.dispatchEvent(new KeyboardEvent('keypress',
                                                            { keyCode: key }));
      assert.ok(spy.called);
    }

    test('key up seek', function() {
      sendEventAndTest(KeyEvent.DOM_VK_UP);
    });

    test('key down seek', function() {
      sendEventAndTest(KeyEvent.DOM_VK_DOWN);
    });
  });
});
