/* global TitleBar, Sanitizer, MocksHelper, ModeManager, LazyLoader */
'use strict';

require('/shared/js/sanitizer.js');

require('/shared/js/accessibility_helper.js');
require('/js/ui/title_bar.js');

require('/test/unit/ui/views/mock_modemanager.js');
require('/test/unit/ui/views/mock_player_view.js');
require('/test/unit/metadata/mock_album_art_cache.js');
require('/test/unit/mock_lazy_loader.js');

var mocksForTitleBarHelper = new MocksHelper([
  'LazyLoader',
  'AlbumArtCache',
  'ModeManager',
  'PlayerView'
]).init();

suite('TitleBar', function() {

  mocksForTitleBarHelper.attachTestHelpers();

  suiteSetup(function() {

    this.element = document.createElement('div');
    this.element.setAttribute('id', 'title');
    this.element.setAttribute('action', 'back');
    this.element.setAttribute('no-font-fit', null);
    this.element.innerHTML = Sanitizer.unwrapSafeHTML(
      Sanitizer.createSafeHTML(
        `<h1 id="title-text"><bdi data-l10n-id="music"></bdi></h1>
          <button id="title-player" data-icon="play-circle"
          data-l10n-id="go-to-player-view"></button>
          <button id="title-done" data-l10n-id="done">Done</button>`
      ));
    document.body.appendChild(this.element);
    this.titleBar = TitleBar;
    this.titleBar.init();
  });

  suiteTeardown(function() {
    document.body.removeChild(this.element);
    this.element = null;
  });

  suite('test player icon', function() {
    var spy;

    setup(function() {
      spy = this.sinon.spy(ModeManager, 'push');
      var titlePlayer = document.getElementById('title-player');
      titlePlayer.click();
    });
    test('test modemanager push called', function() {
      assert.ok(spy.called);
    }, this);
  });

  suite('test done button', function() {
    var spy;

    setup(function() {
      spy = this.sinon.spy(LazyLoader, 'load');
      var titleDone = document.getElementById('title-done');
      titleDone.click();
    });
    test('test album art fetching triggered', function() {
      assert.ok(spy.called);
    });
  });
});
