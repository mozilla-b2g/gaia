/* global MockL10n, ModeManager, MocksHelper, loadBodyHTML,
          MODE_TILES, MODE_LIST, MODE_SUBLIST, MODE_PLAYER,
          MODE_SEARCH_FROM_TILES, MODE_SEARCH_FROM_LIST, MODE_PICKER,
          TilesView, ListView, SubListView, PlayerView, SearchView */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/test/unit/mock_lazy_loader.js');
require('/test/unit/mock_music.js');
require('/test/unit/ui/mock_title_bar.js');
require('/test/unit/ui/mock_tab_bar.js');
require('/test/unit/ui/views/mock_tiles_view.js');
require('/test/unit/ui/views/mock_list_view.js');
require('/test/unit/ui/views/mock_subList_view.js');
require('/test/unit/ui/views/mock_player_view.js');
require('/test/unit/ui/views/mock_search_view.js');
require('/js/ui/views/mode_manager.js');

var mocksForModeManagerHelper = new MocksHelper([
  'LazyLoader',
  'asyncStorage',
  'App',
  'TitleBar',
  'TabBar',
  'TilesView',
  'ListView',
  'SubListView',
  'PlayerView',
  'SearchView'
]).init();

suite('Mode Manager Test', function() {
  var realL10n;
  var mm;

  mocksForModeManagerHelper.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    loadBodyHTML('/index.html');

    mm = ModeManager;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('Start some views', function() {
    test('Start TILES', function() {
      mm.start(MODE_TILES, function() {
        assert.equal(mm.currentMode, MODE_TILES);
      });
    });

    test('Start LIST', function() {
      mm.start(MODE_LIST, function() {
        assert.equal(mm.currentMode, MODE_LIST);
      });
    });

    test('Start PICKER', function() {
      mm.start(MODE_PICKER, function() {
        assert.equal(mm.currentMode, MODE_PICKER);
      });
    });

    test('Start SEARCH(From Tiles)', function() {
      mm.start(MODE_SEARCH_FROM_TILES, function() {
        assert.equal(mm.currentMode, MODE_SEARCH_FROM_TILES);
      });
    });

    test('Start SEARCH(From List)', function() {
      mm.start(MODE_SEARCH_FROM_LIST, function() {
        assert.equal(mm.currentMode, MODE_SEARCH_FROM_LIST);
      });
    });
  });

  suite('Start then push some views', function() {
    test('TILES > PLAYER', function() {
      mm.start(MODE_TILES, function() {
        mm.push(MODE_PLAYER, function() {
          assert.equal(mm.currentMode, MODE_PLAYER);
        });
      });
    });

    test('LIST > SUBLIST', function() {
      mm.start(MODE_LIST, function() {
        mm.push(MODE_SUBLIST, function() {
          assert.equal(mm.currentMode, MODE_SUBLIST);
        });
      });
    });

    test('LIST > PLAYER', function() {
      mm.start(MODE_LIST, function() {
        mm.push(MODE_PLAYER, function() {
          assert.equal(mm.currentMode, MODE_PLAYER);
        });
      });
    });

    test('PICKER > PLAYER', function() {
      mm.start(MODE_PICKER, function() {
        mm.push(MODE_PLAYER, function() {
          assert.equal(mm.currentMode, MODE_PLAYER);
        });
      });
    });

    test('SEARCH(From Tiles) > PLAYER', function() {
      mm.start(MODE_SEARCH_FROM_TILES, function() {
        mm.push(MODE_PLAYER, function() {
          assert.equal(mm.currentMode, MODE_PLAYER);
        });
      });
    });

    test('SEARCH(From List) > PLAYER', function() {
      mm.start(MODE_SEARCH_FROM_LIST, function() {
        mm.push(MODE_PLAYER, function() {
          assert.equal(mm.currentMode, MODE_PLAYER);
        });
      });
    });

    test('LIST > SUBLIST > PLAYER', function() {
      mm.start(MODE_LIST, function() {
        mm.push(MODE_SUBLIST, function() {
          mm.push(MODE_PLAYER, function() {
            assert.equal(mm.currentMode, MODE_PLAYER);
          });
        });
      });
    });

    test('SEARCH(From Tiles) > SUBLIST > PLAYER', function() {
      mm.start(MODE_SEARCH_FROM_TILES, function() {
        mm.push(MODE_SUBLIST, function() {
          mm.push(MODE_PLAYER, function() {
            assert.equal(mm.currentMode, MODE_PLAYER);
          });
        });
      });
    });

    test('SEARCH(From List) > SUBLIST > PLAYER', function() {
      mm.start(MODE_SEARCH_FROM_LIST, function() {
        mm.push(MODE_SUBLIST, function() {
          mm.push(MODE_PLAYER, function() {
            assert.equal(mm.currentMode, MODE_PLAYER);
          });
        });
      });
    });
  });

  suite('Start then pop some views', function() {
    test('TILES > PLAYER > TILES', function() {
      mm.start(MODE_TILES, function() {
        mm.push(MODE_PLAYER, function() {
          mm.pop();
          assert.equal(mm.currentMode, MODE_TILES);
        });
      });
    });

    test('LIST > PLAYER > LIST', function() {
      mm.start(MODE_LIST, function() {
        mm.push(MODE_PLAYER, function() {
          mm.pop();
          assert.equal(mm.currentMode, MODE_LIST);
        });
      });
    });

    test('LIST > SUBLIST > LIST', function() {
      mm.start(MODE_LIST, function() {
        mm.push(MODE_SUBLIST, function() {
          mm.pop();
          assert.equal(mm.currentMode, MODE_LIST);
        });
      });
    });

    test('PICKER > PLAYER > PICKER', function() {
      mm.start(MODE_PICKER, function() {
        mm.push(MODE_PLAYER, function() {
          mm.pop();
          assert.equal(mm.currentMode, MODE_PICKER);
        });
      });
    });

    test('LIST > SUBLIST > PLAYER > SUBLIST > LIST', function() {
      mm.start(MODE_LIST, function() {
        mm.push(MODE_SUBLIST, function() {
          mm.push(MODE_PLAYER, function() {
            mm.pop();
            mm.pop();
            assert.equal(mm.currentMode, MODE_LIST);
          });
        });
      });
    });

    test('SEARCH(Tiles) > SUBLIST > PLAYER > SUBLIST > SEARCH', function() {
      mm.start(MODE_SEARCH_FROM_TILES, function() {
        mm.push(MODE_SUBLIST, function() {
          mm.push(MODE_PLAYER, function() {
            mm.pop();
            mm.pop();
            assert.equal(mm.currentMode, MODE_SEARCH_FROM_TILES);
          });
        });
      });
    });

    test('SEARCH(List) > SUBLIST > PLAYER > SUBLIST > SEARCH', function() {
      mm.start(MODE_SEARCH_FROM_LIST, function() {
        mm.push(MODE_SUBLIST, function() {
          mm.push(MODE_PLAYER, function() {
            mm.pop();
            mm.pop();
            assert.equal(mm.currentMode, MODE_SEARCH_FROM_LIST);
          });
        });
      });
    });
  });

  suite('Initialize some views', function() {
    setup(function() {
      for (var mode in mm.views) {
        mm.views[mode].isLoaded = false;
      }
    });

    test('Initialize TILES', function() {
      var spy = this.sinon.spy(TilesView, 'init');

      mm.waitForView(MODE_TILES, (view) => {
        assert.ok(spy.calledOnce);
        assert.equal(view.isLoaded, true);
      });
    });

    test('Initialize LIST', function() {
      var spy = this.sinon.spy(ListView, 'init');

      mm.waitForView(MODE_LIST, (view) => {
        assert.ok(spy.calledOnce);
        assert.equal(view.isLoaded, true);
      });
    });

    test('Initialize SUBLIST', function() {
      var spy = this.sinon.spy(SubListView, 'init');

      mm.waitForView(MODE_SUBLIST, (view) => {
        assert.ok(spy.calledOnce);
        assert.equal(view.isLoaded, true);
      });
    });

    test('Initialize PLAYER', function() {
      var spy = this.sinon.spy(PlayerView, 'init');

      mm.waitForView(MODE_PLAYER, (view) => {
        assert.ok(spy.calledOnce);
        assert.equal(view.isLoaded, true);
      });
    });

    test('Initialize SEARCH(Tiles)', function() {
      var spy = this.sinon.spy(SearchView, 'init');

      mm.waitForView(MODE_SEARCH_FROM_TILES, (view) => {
        assert.ok(spy.calledOnce);
        assert.equal(view.isLoaded, true);
      });
    });

    test('Initialize SEARCH(List)', function() {
      var spy = this.sinon.spy(SearchView, 'init');

      mm.waitForView(MODE_SEARCH_FROM_LIST, (view) => {
        assert.ok(spy.calledOnce);
        assert.equal(view.isLoaded, true);
      });
    });
  });
});
