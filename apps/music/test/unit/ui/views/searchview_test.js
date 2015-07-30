/* global SearchView, Sanitizer, MocksHelper, FocusEvent */
'use strict';

require('/shared/js/sanitizer.js');

require('/js/ui/views/search_view.js');

require('/test/unit/ui/views/mock_modemanager.js');
require('/test/unit/ui/mock_tab_bar.js');

var mocksForSearchViewHelper = new MocksHelper([
  'ModeManager',
  'TabBar'
]).init();


suite('SearchView', function() {

  mocksForSearchViewHelper.attachTestHelpers();

  suiteSetup(function() {

    this.element = document.createElement('div');
    this.element.setAttribute('id', 'views-search');
    this.element.setAttribute('action', 'back');
    this.element.setAttribute('no-font-fit', null);
    this.element.innerHTML = Sanitizer.unwrapSafeHTML(
      Sanitizer.createSafeHTML(
        `<form id="views-search-form" role="search" class="skin-dark">
          <button id="views-search-close" data-l10n-id="search-close"
          type="submit">close</button>
          <p>
            <input id="views-search-input" type="search" dir="auto"
                   x-inputmode="verbatim"
                   data-l10n-id="search-music" placeholder="SearcH MusiC">
            <button id="views-search-clear" type="reset">Clear</button>
          </p>
        </form>
        <div id="views-search-no-result" class="search-category hidden">
          <p id="search-no-result" data-l10n-id="search-no-result">No
          musiC founD</p>
        </div>
        <div id="views-search-anchor">
          <div id="views-search-artists" class="search-category hidden">
            <gaia-subheader skin="dark">
              <span data-l10n-id="search-artists">ArtistS</span>
                (<span class="search-result-count"></span>)
            </gaia-subheader>
            <div class="search-results" role="listbox"></div>
          </div>
          <div id="views-search-albums" class="search-category hidden">
            <gaia-subheader skin="dark">
              <span data-l10n-id="search-albums">AlbumS</span>
                (<span class="search-result-count"></span>)
            </gaia-subheader>
            <div class="search-results" role="listbox"></div>
          </div>
          <div id="views-search-titles" class="search-category hidden">
            <gaia-subheader skin="dark">
              <span data-l10n-id="search-titles">TrackS</span>
                (<span class="search-result-count"></span>)
            </gaia-subheader>
            <div class="search-results" role="listbox"></div>
          </div>
        </div>`
      ));
    document.body.appendChild(this.element);
    this.searchView = SearchView;
    this.searchView.init();
  });

  suiteTeardown(function() {
    document.body.removeChild(this.element);
    this.element = null;
  });

  // send a fake touchend event to el
  function sendTouch(el) {
    var touchendEvent = document.createEvent('TouchEvent');
    touchendEvent.initTouchEvent('touchend', true, true, window,
                                 0, false, false, false, false,
                                 null, null, null);
    el.dispatchEvent(touchendEvent);
  }

  suite('test focus', function() {
    var spy;

    setup(function() {
      spy = this.sinon.spy(SearchView, 'switchContext');
      var searchInput = document.getElementById('views-search-input');
      searchInput.dispatchEvent(new FocusEvent('focus'));
    });

    test('test context switched', function() {
      assert.ok(spy.called, 'SearchView.switchContext() should be called');
      assert.equal(SearchView.searchContext, SearchView.context.ALL);
    }, this);
  });


  suite('test tap clear', function() {
    var spy;
    var searchInput;

    setup(function() {
      spy = this.sinon.spy(SearchView, 'clear');
      searchInput = document.getElementById('views-search-input');
      searchInput.value = 'this is not the search you are looking for';
      var searchClear = document.getElementById('views-search-clear');
      sendTouch(searchClear);
    });

    test('test that search is now empty', function() {
      assert.ok(spy.called, 'SearchView.clear() should be called');
      assert.equal(searchInput.value, '');
    });
  });

  suite('test close', function() {
    var spy, spy2;

    setup(function() {
      spy = this.sinon.spy(SearchView, 'hide');
      spy2 = this.sinon.spy(SearchView, 'openResult');
      var searchClose = document.getElementById('views-search-close');
      searchClose.click();
    });

    test('test search is hidden', function() {
      assert.ok(spy.called, 'SearchView.hide() should be called');
      assert.ok(!spy2.called, 'SearchVie.openResult() should not be called');
    }, this);
  });

});
