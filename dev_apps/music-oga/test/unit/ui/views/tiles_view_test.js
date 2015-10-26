/* global TilesView, Sanitizer, MocksHelper, ModeManager, FocusEvent,
   MODE_TILES */
'use strict';

require('/shared/js/sanitizer.js');

require('/js/ui/views/tiles_view.js');

require('/test/unit/mock_db.js');
require('/test/unit/metadata/mock_album_art_cache.js');
require('/test/unit/ui/views/mock_modemanager.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksForTilesViewHelper = new MocksHelper([
  'LazyLoader',
  'AlbumArtCache',
  'ModeManager',
  'Database'
]).init();


suite('Tiles view test', function() {

  mocksForTilesViewHelper.attachTestHelpers();

  suiteSetup(function() {

    this.element = document.createElement('div');
    this.element.id = 'views-tiles';
    document.body.appendChild(this.element);
    this.element.innerHTML = Sanitizer.unwrapSafeHTML(
      Sanitizer.createSafeHTML(
        `<form id="views-tiles-search" role="search" class="skin-dark">
          <button id="views-tiles-search-close" data-l10n-id="search-close"
        type="submit">close</button>
          <p>
          <input id="views-tiles-search-input" type="search" dir="auto"
        x-inputmode="verbatim"
        data-l10n-id="search-music" placeholder="SearcH MusiC">
          <button id="views-tiles-search-clear" type="reset">Clear</button>
          </p>
          </form>
          <div id="views-tiles-anchor"></div>`
      ));

    this.tilesView = TilesView;

    this.tilesView.init();
  });

  suiteTeardown(function() {
    document.body.removeChild(this.element);
    this.element = null;
  });

  suite('activate', function() {
    setup(function(done) {
      this.tilesView.activate(() => done());
    });

    test('content', function() {
      var children = this.tilesView.anchor.childNodes;
      var count = children.length;
      assert.equal(count, 4);

      var first = this.tilesView.anchor.firstChild;
      assert.equal(first.tagName, 'DIV');
      assert.ok(first.classList.contains('main-tile'));
      assert.ok(first.classList.contains('tile'));
      assert.equal(first.textContent, 'SupertrampCrime of the Century');

      var second = children[1];
      assert.equal(second.tagName, 'DIV');
      assert.ok(second.classList.contains('sub-tile'));
      assert.ok(second.classList.contains('tile'));
      assert.equal(second.textContent, 'Supertramp');
    });
  });

  suite('events', function() {
    var spy;

    setup(function(done) {
      this.tilesView.activate(() => done());
    });

    test('click tile', function() {
      spy = this.sinon.spy(ModeManager, 'push');
      var tile = document.querySelector('.tile > [role="button"]');
      assert.ok(tile);
      tile.click();
      assert.ok(spy.called, 'ModeManager.push() should be called');
    });

    test('click search close', function() {
      spy = this.sinon.spy(TilesView, 'hideSearch');

      document.getElementById('views-tiles-search-close').click();
      assert.ok(spy.called, 'TilesView.hideSearch() should have been called');
    });

    test('focus on search', function() {
      // make sure this return the right value
      this.sinon.stub(ModeManager, 'currentMode', () => MODE_TILES );
      var spy = this.sinon.spy(ModeManager, 'start');
      var input = document.getElementById('views-tiles-search-input');
      input.dispatchEvent(new FocusEvent('focus'));

      assert.ok(spy.called, 'ModeManager.start should have been called');
    });
  });


});

