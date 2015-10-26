/* global MockAsyncStorage, MockDatabase, PlaybackQueue, pass, fail */
'use strict';

require('/test/unit/mock_async_storage.js');
require('/test/unit/mock_db.js');
require('/test/unit/utils.js');
require('/js/queue.js');

suite('playback queues', () => {
  var RealAsyncStorage, RealDatabase;

  setup(() => {
    RealAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockAsyncStorage;
    window.asyncStorage.clear();

    RealDatabase = window.Database;
    window.Database = MockDatabase;
  });

  teardown(() => {
    window.asyncStorage = RealAsyncStorage;
    window.Database = RealDatabase;
  });

  suite('settings', () => {

    test('load default settings', (done) => {
      PlaybackQueue.loadSettings().then(() => {
        assert.strictEqual(PlaybackQueue.repeat, PlaybackQueue.Repeat.OFF);
        assert.strictEqual(PlaybackQueue.shuffle, false);
      }).then(pass(done), fail(done));
    });

    test('save settings', (done) => {
      PlaybackQueue.loadSettings().then(() => {
        PlaybackQueue.repeat = PlaybackQueue.Repeat.SONG;
        PlaybackQueue.shuffle = true;
        return PlaybackQueue.loadSettings();
      }).then(() => {
        assert.strictEqual(PlaybackQueue.repeat, PlaybackQueue.Repeat.SONG);
        assert.strictEqual(PlaybackQueue.shuffle, true);
      }).then(pass(done), fail(done));
    });

  });

  var infos = [
    {name: 'static queue', creator: (fileinfos, index) => {
      return new PlaybackQueue.StaticQueue(fileinfos, index);
    }},
    {name: 'dynamic queue', creator: (fileinfos, index) => {
      return new PlaybackQueue.DynamicQueue({count: fileinfos.length}, index);
    }},
  ];

  infos.forEach(({name: name, creator: creator}) => {

    suite(name, () => {
      var fileinfos;

      function checkCurrent(queue, rawIndex, shuffledIndices = null) {
        var index = shuffledIndices ? shuffledIndices[rawIndex] : rawIndex;

        assert.strictEqual(queue.rawIndex, rawIndex);
        assert.strictEqual(queue.index, index);
        return queue.current().then((info) => {
          assert.deepEqual(info, fileinfos[index]);
        });
      }

      setup((done) => {
        fileinfos = MockDatabase._mockResultsMetadataAlbum;
        PlaybackQueue.loadSettings().then(pass(done), fail(done));
      });

      suite('basic', () => {
        var queue;

        setup(() => {
          queue = creator(fileinfos);
        });

        test('length', () => {
          assert.strictEqual(queue.length, fileinfos.length);
        });

        test('index', () => {
          assert.strictEqual(queue.index, 0);
        });

        test('rawIndex', () => {
          assert.strictEqual(queue.rawIndex, 0);
        });

        test('current()', (done) => {
          checkCurrent(queue, 0).then(pass(done), fail(done));
        });

        test('next()', (done) => {
          queue.next();
          checkCurrent(queue, 1).then(pass(done), fail(done));
        });

        test('previous()', (done) => {
          queue.next();
          queue.previous();
          checkCurrent(queue, 0).then(() => {
            queue.previous();
            return checkCurrent(queue, 0);
          }).then(pass(done), fail(done));
        });

        test('start at known index', (done) => {
          queue = creator(fileinfos, 1);
          checkCurrent(queue, 1).then(pass(done), fail(done));
        });
      });

      suite('repeat list', () => {
        var queue;

        setup(() => {
          PlaybackQueue.repeat = PlaybackQueue.Repeat.LIST;
          queue = creator(fileinfos);
        });

        test('next()', (done) => {
          queue.next();
          queue.next();
          queue.next();
          queue.next();

          checkCurrent(queue, 0).then(pass(done), fail(done));
        });

        test('previous()', (done) => {
          queue.previous();
          checkCurrent(queue, 3).then(pass(done), fail(done));
        });

        test('start at known index', (done) => {
          queue = creator(fileinfos, 3);
          checkCurrent(queue, 3).then(() => {
            queue.next();
            return checkCurrent(queue, 0);
          }).then(pass(done), fail(done));
        });
      });

      suite('repeat song', () => {
        var queue;

        setup(() => {
          PlaybackQueue.repeat = PlaybackQueue.Repeat.SONG;
          queue = creator(fileinfos);
        });

        test('next(false)', (done) => {
          queue.next();
          checkCurrent(queue, 1).then(pass(done), fail(done));
        });

        test('next(true)', (done) => {
          queue.next(true);
          checkCurrent(queue, 0).then(pass(done), fail(done));
        });

        test('previous()', (done) => {
          queue.previous();
          checkCurrent(queue, 0).then(pass(done), fail(done));
        });
      });

      suite('shuffle', () => {
        var queue, RealRandom, seed;

        function MockRandom() {
          var x = Math.sin(seed++) * 1000;
          return x - Math.floor(x);
        }

        setup(() => {
          seed = 1;
          RealRandom = Math.random;
          Math.random = MockRandom;

          PlaybackQueue.shuffle = true;

          queue = creator(fileinfos);
        });

        teardown(() => {
          Math.random = RealRandom;
        });

        test('shuffled order', (done) => {
          var expectedIndices = [3, 2, 0, 1];

          checkCurrent(queue, 0, expectedIndices).then(() => {
            queue.next();
            return checkCurrent(queue, 1, expectedIndices);
          }).then(() => {
            queue.next();
            return checkCurrent(queue, 2, expectedIndices);
          }).then(() => {
            queue.next();
            return checkCurrent(queue, 3, expectedIndices);
          }).then(pass(done), fail(done));
        });

        test('repeat list', (done) => {
          PlaybackQueue.repeat = PlaybackQueue.Repeat.LIST;
          var expectedIndices = [3, 1, 2, 0];

          queue.next();
          queue.next();
          queue.next();
          queue.next();

          checkCurrent(queue, 0, expectedIndices).then(() => {
            queue.next();
            return checkCurrent(queue, 1, expectedIndices);
          }).then(() => {
            queue.next();
            return checkCurrent(queue, 2, expectedIndices);
          }).then(() => {
            queue.next();
            return checkCurrent(queue, 3, expectedIndices);
          }).then(pass(done), fail(done));
        });

        test('start at known index', (done) => {
          var expectedIndices = [1, 2, 3, 0];
          queue = creator(fileinfos, 1);

          checkCurrent(queue, 0, expectedIndices).then(() => {
            queue.next();
            return checkCurrent(queue, 1, expectedIndices);
          }).then(() => {
            queue.next();
            return checkCurrent(queue, 2, expectedIndices);
          }).then(() => {
            queue.next();
            return checkCurrent(queue, 3, expectedIndices);
          }).then(pass(done), fail(done));
        });

      });

    });
  });

});
