/* global MockL10n, MediaRecording */
'use strict';

mocha.globals(['MediaRecording']);

require('/shared/test/unit/load_body_html_helper.js');
requireApp('system/test/unit/mock_l10n.js');

suite('system/media recording', function() {
  var realL10n;
  var mediaRecording;
  function sendChromeEvent(active, isApp, origin, isAudio, isVideo) {
    var detail = {'active': active,
                  'isApp': isApp,
                  'requestURL': origin,
                  'isAudio': isAudio,
                  'isVideo': isVideo,
                  'type': 'recording-status'
                 };
    var evt = new CustomEvent('mozChromeEvent', { detail: detail });
    window.dispatchEvent(evt);
  }

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    requireApp('system/js/media_recording.js', function() {
      mediaRecording = new MediaRecording();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  setup(function() {
    mediaRecording.start();
  });

  teardown(function() {
    sendChromeEvent(false, false, '', false, false);
    mediaRecording.stop();
  });

  suite('active stat', function() {
    setup(function() {
      sendChromeEvent(true, false, 'http://www.mozilla.com', true, false);
    });

    test('notification displayed', function() {
      assert.isTrue(mediaRecording.container.classList.contains('displayed'));
    });

    test('is Web URL', function() {
      assert.equal(mediaRecording.origin.textContent, 'http://www.mozilla.com');
    });
  });

  suite('should display the origin, rather than the full URL', function() {
    setup(function() {
      sendChromeEvent(true, false,
        'http://mozqa.com/qa-testcase-data/webapi/webrtc/gum_test.html',
        true, false);
    });

    test('is Web URL', function() {
      assert.equal(mediaRecording.origin.textContent, 'http://mozqa.com');
    });
  });

  suite('deactive stat', function() {
    setup(function() {
      sendChromeEvent(false, false, 'www.mozilla.com', true, false);
    });

    test('notification hidden', function() {
      assert.isFalse(mediaRecording.container.classList.contains('displayed'));
    });
  });

  suite('voice', function() {
    setup(function() {
      sendChromeEvent(true, false, 'www.mozilla.com', true, false);
    });

    test('show message', function() {
      assert.equal(mediaRecording.message.textContent, 'microphone-is-on');
    });

    test('show icon', function() {
      assert.equal(mediaRecording.icon.style.backgroundImage,
        'url("style/media_recording/images/Microphone.png")');
    });
  });

  suite('video', function() {
    setup(function() {
      sendChromeEvent(true, false, 'www.mozilla.com', false, true);
    });

    test('show message', function() {
      assert.equal(mediaRecording.message.textContent, 'camera-is-on');
    });

    test('show icon', function() {
      assert.equal(mediaRecording.icon.style.backgroundImage,
        'url("style/media_recording/images/Camera.png")');
    });
  });

  suite('media', function() {
    setup(function() {
      sendChromeEvent(true, false, 'www.mozilla.com', true, true);
    });

    test('show message', function() {
      assert.equal(mediaRecording.message.textContent, 'media-is-on');
    });

    test('show icon', function() {
      assert.equal(mediaRecording.icon.style.backgroundImage,
        'url("style/media_recording/images/VideoRecorder.png")');
    });
  });
});
