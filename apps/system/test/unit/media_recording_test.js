/* global MockL10n, MediaRecording */
'use strict';

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
      assert.equal(mediaRecording.messages[0].origin,
        'http://www.mozilla.com');
    });
  });

  suite('should display the origin, rather than the full URL', function() {
    setup(function() {
      sendChromeEvent(true, false,
        'http://mozqa.com/qa-testcase-data/webapi/webrtc/gum_test.html',
        true, false);
    });

    test('is Web URL', function() {
      assert.equal(mediaRecording.messages[0].origin, 'http://mozqa.com');
    });
  });

  suite('deactive stat', function() {
    setup(function() {
      sendChromeEvent(true, false, 'www.mozilla.com', true, false);
    });

    test('notification hidden', function() {
      sendChromeEvent(false, false, 'www.mozilla.com', false, false);
      assert.equal(mediaRecording.messages.length, 0);
    });
  });

  suite('voice', function() {
    setup(function() {
      sendChromeEvent(true, false, 'www.mozilla.com', true, false);
    });

    test('show message', function() {
      assert.equal(mediaRecording.messages[0].message, 'microphone-is-on');
    });

    test('show icon', function() {
      assert.equal(mediaRecording.messages[0].icon,
        'url(style/media_recording/images/Microphone.png)');
    });
  });

  suite('video', function() {
    setup(function() {
      sendChromeEvent(true, false, 'www.mozilla.com', false, true);
    });

    test('show message', function() {
      assert.equal(mediaRecording.messages[0].message, 'camera-is-on');
    });

    test('show icon', function() {
      assert.equal(mediaRecording.messages[0].icon,
        'url(style/media_recording/images/Camera.png)');
    });
  });

  suite('media', function() {
    setup(function() {
      sendChromeEvent(true, false, 'www.mozilla.com', true, true);
    });

    test('show message', function() {
      assert.equal(mediaRecording.messages[0].message, 'media-is-on');
    });

    test('show icon', function() {
      assert.equal(mediaRecording.messages[0].icon,
        'url(style/media_recording/images/VideoRecorder.png)');
    });
  });

  suite('multiple messages', function() {
    setup(function() {
      sendChromeEvent(true, false, 'www.mozilla.com', true, false);
      sendChromeEvent(true, false, 'www.mozilla.org', false, true);
    });

    test('show messages', function() {
      assert.equal(mediaRecording.messages[0].message, 'microphone-is-on');
      assert.equal(mediaRecording.messages[1].message, 'camera-is-on');
    });

    test('kill first url, still show message', function() {
      sendChromeEvent(false, false, 'www.mozilla.com', false, false);

      assert.equal(mediaRecording.messages.length, 1);
      assert.equal(mediaRecording.messages[0].message, 'camera-is-on');
    });

    test('kill 2nd url, still show message', function() {
      sendChromeEvent(false, false, 'www.mozilla.org', false, false);

      assert.equal(mediaRecording.messages.length, 1);
      assert.equal(mediaRecording.messages[0].message, 'microphone-is-on');
    });

    test('hide message', function() {
      sendChromeEvent(false, false, 'www.mozilla.com', false, false);
      sendChromeEvent(false, false, 'www.mozilla.org', false, false);

      assert.equal(mediaRecording.messages.length, 0);
    });
  });
});
