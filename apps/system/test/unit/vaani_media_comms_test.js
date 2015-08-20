'use strict';
/* global VaaniMediaComms */

requireApp('system/js/vaani_media_comms.js');

suite('VaaniMediaComms', function() {

  var vaaniMediaComms;

  setup(function() {
    vaaniMediaComms = new VaaniMediaComms();
    vaaniMediaComms.start();
  });

  teardown(function() {
    vaaniMediaComms.stop();
    vaaniMediaComms = null;
  });

  test('format duration - ISO8610', function() {
    assert.equal('PT0S', vaaniMediaComms.formatISO8610Duration(0));
    assert.equal('PT0S', vaaniMediaComms.formatISO8610Duration(100));
    assert.equal('PT1S', vaaniMediaComms.formatISO8610Duration(501));
    assert.equal('PT1M1S', vaaniMediaComms.formatISO8610Duration(60501));
    assert.equal('PT1H1S', vaaniMediaComms.formatISO8610Duration(3600501));
  });

  suite('handle appterminated', function() {
    var sendMessageStub;
    var sendMessageIACType;
    var sendMessageData;

    setup(function() {
      vaaniMediaComms.mediaAppOrigin = 'app://media-app';
      sendMessageStub = this.sinon.stub(vaaniMediaComms, 'sendMessage',
                                      (iac, data) => {
        sendMessageIACType = iac;
        sendMessageData = data;
      });
    });

    teardown(function() {
      sendMessageStub.restore();
      sendMessageIACType = null;
      sendMessageData = null;
    });

    test('not media app', function() {
      window.dispatchEvent(new CustomEvent('appterminated', {
        detail: {
          origin: 'app://another-app'
        }
      }));

      assert.isFalse(sendMessageStub.called);
    });

    test('media app', function() {
      window.dispatchEvent(new CustomEvent('appterminated', {
        detail: {
          origin: 'app://media-app'
        }
      }));

      assert.isTrue(sendMessageStub.called);
      assert.equal('vaani-media-comms', sendMessageIACType);
      assert.equal('DeleteAction', sendMessageData['@type']);
    });
  });

  suite('handle message from mediacomms', function() {
    var sendMessageStub;
    var sendMessageIACType;
    var sendMessageData;

    setup(function() {
      sendMessageStub = this.sinon.stub(vaaniMediaComms, 'sendMessage',
                                      (iac, data) => {
        sendMessageIACType = iac;
        sendMessageData = data;
      });
    });

    teardown(function() {
      sendMessageStub.restore();
      sendMessageIACType = null;
      sendMessageData = null;
    });

    test('appinfo', function() {
      window.dispatchEvent(new CustomEvent('iac-mediacomms', {
        detail: {
          type: 'appinfo',
          data: { origin : 'http://media-app' }
        }
      }));
      assert.equal('http://media-app', vaaniMediaComms.mediaAppOrigin);
    });

    suite('nowplaying', function() {
      test('without blob', function() {
        window.dispatchEvent(new CustomEvent('iac-mediacomms', {
          detail: {
            type: 'nowplaying',
            data: {
              title: 'dummy-title',
              artist: 'dummy-artist',
              album: 'dummy-album',
              duration: 501
            }
          }
        }));
        assert.isTrue(sendMessageStub.called);
        assert.equal('vaani-media-comms', sendMessageIACType);
        assert.equal('UpdateAction', sendMessageData['@type']);

        var targetCollection = sendMessageData.targetCollection;
        assert.equal('dummy-title', targetCollection.headline);
        assert.equal('PT1S', targetCollection.duration);
        assert.equal('dummy-artist', targetCollection.byArtist.name);
        assert.equal('dummy-album', targetCollection.inAlbum.name);
        assert.isUndefined(targetCollection.thumbnailBlob,
                           'should not define blob');
      });

      test('with blob', function() {
        window.dispatchEvent(new CustomEvent('iac-mediacomms', {
          detail: {
            type: 'nowplaying',
            data: {
              title: 'dummy-title',
              artist: 'dummy-artist',
              album: 'dummy-album',
              duration: 501,
              picture: 'dummy-blob'
            }
          }
        }));
        assert.isTrue(sendMessageStub.called);
        assert.equal('vaani-media-comms', sendMessageIACType);
        assert.equal('UpdateAction', sendMessageData['@type']);
        assert.isDefined(sendMessageData.targetCollection.thumbnailBlob,
                         'should define blob');
      });
    });

    test('status', function() {
      window.dispatchEvent(new CustomEvent('iac-mediacomms', {
        detail: {
          type: 'status',
          data: 'dummy-status'
        }
      }));
      assert.isTrue(sendMessageStub.called);
      assert.equal('vaani-media-comms', sendMessageIACType);
      assert.equal('StatusUpdate', sendMessageData['@type']);
      assert.equal('dummy-status', sendMessageData.status);
    });
  });

  suite('handle message from vaani-media-comms', function() {
    var sendMediaStub;
    var sendMediaData;
    var sendVaaniStub;
    var sendVaaniData;

    setup(function() {
      sendMediaStub = this.sinon.stub(vaaniMediaComms, 'sendMediaMessage',
                                      (data) => {
        sendMediaData = data;
      });
      sendVaaniStub = this.sinon.stub(vaaniMediaComms, 'sendVaaniMessage',
                                      (data) => {
        sendVaaniData = data;
      });
    });

    teardown(function() {
      sendMediaStub.restore();
      sendMediaData = null;

      sendVaaniStub.restore();
      sendVaaniData = null;
    });

    [{
      'type': 'ListenAction',
      'mediaData': 'playpause'
    }, {
      'type': 'SuspendAction',
      'mediaData': 'playpause'
    }, {
      'type': 'SkipBackwardAction',
      'mediaData': 'prevtrack'
    }, {
      'type': 'SkipForwardAction',
      'mediaData': 'nexttrack'
    }].forEach(function(testCase) {
      test(testCase.type, function() {
        window.dispatchEvent(new CustomEvent('iac-vaani-media-comms', {
          detail: {
            '@type': testCase.type
          }
        }));

        assert.isTrue(sendMediaStub.called);
        assert.equal(testCase.mediaData, sendMediaData);

        assert.isTrue(sendVaaniStub.called);
        assert.equal('CompletedActionStatus', sendVaaniData.actionStatus);
      });
    });

    test('unknown message', function() {
      window.dispatchEvent(new CustomEvent('iac-vaani-media-comms', {
        detail: {
          '@type': 'unknown'
        }
      }));

      assert.isFalse(sendMediaStub.called);
      assert.isTrue(sendVaaniStub.called);
      assert.equal('FailedActionStatus', sendVaaniData.actionStatus);
    });
  });
});
