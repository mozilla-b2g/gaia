/* global ListView, Sanitizer, MocksHelper, ModeManager, FocusEvent,
   MODE_LIST */
'use strict';

require('/shared/js/sanitizer.js');

require('/js/utils.js');
require('/js/ui/views/list_view.js');

require('/test/unit/mock_db.js');
require('/test/unit/mock_music.js');
require('/test/unit/metadata/mock_album_art_cache.js');
require('/test/unit/ui/views/mock_modemanager.js');
require('/test/unit/ui/views/mock_subList_view.js');
require('/test/unit/mock_lazy_loader.js');

var mocksForListViewHelper = new MocksHelper([
  'LazyLoader',
  'AlbumArtCache',
  'ModeManager',
  'SubListView',
  'App',
  'Database'
]).init();

suite('ListView test', function() {

  mocksForListViewHelper.attachTestHelpers();

  suiteSetup(function() {

    ModeManager._view = ListView;

    this.element = document.createElement('div');
    this.element.id = 'views-list';
    document.body.appendChild(this.element);
    this.element.innerHTML = Sanitizer.unwrapSafeHTML(
      Sanitizer.createSafeHTML(
        `<form id="views-list-search" role="search" class="skin-dark">
          <button id="views-list-search-close" data-l10n-id="search-close"
        type="submit">close</button>
          <p>
          <input id="views-list-search-input" type="search"
        x-inputmode="verbatim"
        data-l10n-id="search-music" placeholder="SearcH MusiC">
          <button id="views-list-search-clear" type="reset">Clear</button>
          </p>
          </form>
          <div id="views-list-anchor" role="listbox"></div>`
      ));

    this.listView = ListView;

    this.listView.init();

    this.listView.activate( {
      key: 'metadata.album',
      range: null,
      direction: 'nextunique',
      option: 'album'
    });
  });

  suiteTeardown(function() {
    document.body.removeChild(this.element);
    this.element = null;
  });

  suite('activate', function() {

    test('content', function() {
      // Mock data has 4 albums, with 3 different letters. So, 7 list items
      var children = this.listView.anchor.children;
      var count = children.length;
      assert.equal(count, 7);

      children = this.listView.anchor.querySelectorAll('.list-item');
      count = children.length;
      assert.equal(count, 4);

      var first = this.listView.anchor.firstChild;
      assert.equal(first.tagName, 'LI');
      assert.ok(first.classList.contains('list-header'));
      assert.equal(first.getAttribute('role'), 'heading');
      assert.equal(first.textContent, 'C');

      first = this.listView.anchor.querySelector('.list-item');
      assert.equal(first.tagName, 'LI');
      assert.equal(first.getAttribute('role'), 'presentation');
      assert.equal(first.textContent, 'Crime of the CenturySupertramp');

      var second = children[1];
      assert.equal(second.tagName, 'LI');
      assert.equal(first.getAttribute('role'), 'presentation');
      assert.equal(second.textContent, 'Crisis? What Crisis?Supertramp');
    });
  });

  suite('events', function() {
    var spy;

    test('click tile', function() {
      spy = this.sinon.spy(ListView, 'activateSubListView');
      var listItem = document.querySelector('.list-item > [role="option"]');
      assert.ok(listItem);
      listItem.click();
      assert.ok(spy.called,
                'ListView.activateSubListView() should have been called');
    });

    test('click search close', function() {
      spy = this.sinon.spy(ListView, 'hideSearch');

      document.getElementById('views-list-search-close').click();
      assert.ok(spy.called, 'ListView.hideSearch() should have been called');
    });

    test('focus on search', function() {
      // make sure this return the right value
      this.sinon.stub(ModeManager, 'currentMode', () => MODE_LIST );
      var spy = this.sinon.spy(ModeManager, 'start');
      var input = document.getElementById('views-list-search-input');
      input.dispatchEvent(new FocusEvent('focus'));

      assert.ok(spy.called, 'ModeManager.start() should have been called');
    });
  });

});

