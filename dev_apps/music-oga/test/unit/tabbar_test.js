/* global TabBar, Sanitizer, MocksHelper */
/* exported ListView, TilesView */
'use strict';

require('/shared/js/sanitizer.js');

require('/shared/js/accessibility_helper.js');
require('/js/ui/tab_bar.js');

require('/test/unit/ui/views/mock_modemanager.js');
require('/test/unit/ui/views/mock_list_view.js');
require('/test/unit/ui/views/mock_tiles_view.js');

var mocksForTabBarHelper = new MocksHelper([
  'ListView',
  'TilesView',
  'ModeManager'
]).init();

suite('TabBar', function() {

  mocksForTabBarHelper.attachTestHelpers();

  suiteSetup(function() {
    this.element = document.createElement('div');
    this.element.setAttribute('id', 'tabs');
    this.element.innerHTML = Sanitizer.unwrapSafeHTML(
      Sanitizer.createSafeHTML(
      `<ul role="tablist" class="bb-tablist skin-dark">
        <li id="mix" role="presentation">
          <a id="tabs-mix" data-option="mix" role="tab"
      aria-selected="false" aria-controls="views-tiles"></a>
        </li>
        <li id="playlists" role="presentation">
          <a id="tabs-playlists" data-option="playlist" role="tab"
      aria-selected="false" aria-controls="views-list"></a>
        </li>
        <li id="artists" role="presentation">
          <a id="tabs-artists" data-option="artist" role="tab"
      aria-selected="false" aria-controls="views-list"></a>
        </li>
        <li id="albums" role="presentation">
          <a id="tabs-albums" data-option="album" role="tab"
      aria-selected="false" aria-controls="views-list"></a>
        </li>
        <li id="songs" role="presentation">
          <a id="tabs-songs" data-option="title" role="tab"
      aria-selected="false" aria-controls="views-list"></a>
        </li>
      </ul>`
      ));
    document.body.appendChild(this.element);
    this.links = this.element.querySelectorAll('a');
    this.tabs = TabBar;
    this.tabs.init();
  });

  suiteTeardown(function() {
    document.body.removeChild(this.element);
    this.element = null;
    this.links = null;
  });

  // send a fake touchend event to el
  function sendTouch(el) {
    var touchendEvent = document.createEvent('TouchEvent');
    touchendEvent.initTouchEvent('touchend', true, true, window,
                                 0, false, false, false, false,
                                 null, null, null);
    el.dispatchEvent(touchendEvent);
  }

  // This are hardcoded based on tab_bar.js
  var tabOptions = ['mix', 'playlist', 'artist', 'album', 'title'];

  [0, 1, 2, 3, 4].forEach(function(index) {
    var ariaStates = ['false', 'false', 'false', 'false', 'false'];
    ariaStates[index] = 'true';

    suite('test click link ' + (index + 1), function() {
      setup(function() {
        sendTouch(this.links[index]);
      });
      test('test aria-selected set', function() {
        assert.equal(TabBar.option, tabOptions[index]);
        ariaStates.forEach(function(value, index) {
          assert.equal(this.links[index].getAttribute('aria-selected'), value);
        }, this);
      });
    });

  });

});
