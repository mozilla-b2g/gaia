/* global SubListView, Sanitizer, MocksHelper, ModeManager, MockL10n */
'use strict';

require('/shared/js/sanitizer.js');

require('/js/utils.js');
require('/js/ui/views/subList_view.js');

require('/test/unit/mock_db.js');
require('/test/unit/metadata/mock_album_art_cache.js');
require('/test/unit/ui/mock_tab_bar.js');
require('/test/unit/ui/views/mock_modemanager.js');
require('/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForSubListViewHelper = new MocksHelper([
  'LazyLoader',
  'AlbumArtCache',
  'ModeManager',
  'TabBar',
  'Database'
]).init();

suite('SubListView test', function() {
  var realL10n = navigator.mozL10n;

  mocksForSubListViewHelper.attachTestHelpers();

  suiteSetup(function(done) {
    navigator.mozL10n = MockL10n;

    ModeManager._view = SubListView;

    this.element = document.createElement('div');
    this.element.id = 'views-sublist';
    document.body.appendChild(this.element);
    this.element.innerHTML = Sanitizer.unwrapSafeHTML(
      Sanitizer.createSafeHTML(
        `<div id="views-sublist-header">
          <img id="views-sublist-header-image">
          <div id="views-sublist-header-controls">
            <bdi id="views-sublist-header-name">Name</bdi>
          <button id="views-sublist-controls-play"
        class="album-controls-button" data-icon="play"
        data-l10n-id="playbackPlay"></button>
          <button id="views-sublist-controls-shuffle"
        class="album-controls-button" data-icon="shuffle"
        data-l10n-id="shuffle-toggle"></button>
          </div>
        </div>
        <div id="views-scrollable-sublist-anchor">
          <div id="views-sublist-anchor" role="listbox">
          </div>
        </div>`
      ));

    this.subListView = SubListView;

    this.subListView.init();
    var data = {
      metadata: {
        album: 'Crime of the Century',
        artist: 'Supertramp',
        title: 'School'
      }
    };
    this.subListView.activate('album', data, 0, null, 'next',
                              () => done() );
  });

  suiteTeardown(function() {
    document.body.removeChild(this.element);
    this.element = null;

    navigator.mozL10n = realL10n;
  });

  suite('activate', function() {

    test('content', function() {
      var children = this.subListView.anchor.children;
      var count = children.length;
      assert.equal(count, 4);

      children = this.subListView.anchor.querySelectorAll('.list-item');
      count = children.length;
      assert.equal(count, 4);

      var first = this.subListView.anchor.firstChild;
      assert.equal(first.tagName, 'LI');
      assert.equal(first.getAttribute('role'), 'presentation');
      assert.equal(first.textContent, 'School');

      var second = children[1];
      assert.equal(second.tagName, 'LI');
      assert.equal(first.getAttribute('role'), 'presentation');
      assert.equal(second.textContent, 'Lady');
    });
  });

  suite('events', function() {
    var spy;

    test('click tile', function() {
      spy = this.sinon.spy(ModeManager, 'push');
      var listItem = document.querySelector('.list-item > [role="option"]');
      assert.ok(listItem);
      listItem.click();
      assert.ok(spy.called, 'ModeManager.push() should have been called');
    });

    test('click shuffle', function() {
      spy = this.sinon.spy(ModeManager, 'push');

      document.getElementById('views-sublist-controls-shuffle').click();
      assert.ok(spy.called, 'ModeManager.push() should have been called');
    });
  });

});

