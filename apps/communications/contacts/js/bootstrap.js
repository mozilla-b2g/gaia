/* global Cache */
/* global LazyLoader */
/* global utils */


'use strict';

(function(exports) {

  /** Script loader **/

  function loadScripts() {
    var dependencies = [
     '/contacts/services/contacts.js',
     '/contacts/js/activities.js',
     '/shared/js/contacts/utilities/event_listeners.js',
     '/contacts/js/navigation.js',
     '/contacts/js/param_utils.js',
     '/contacts/js/views/list.js',
     '/contacts/js/header_ui.js'
    ];

    // If the cache is enabled, we push lazy loading l10n to the extreme,
    // cause we will be applying the transalations manually from the cached
    // content.
    // Otherwise, we load the l10n scripts along with the rest of the JS
    // scripts. This will avoid the non localized text to appear in the screen.
    if (!Cache.active) {
      dependencies.push('/shared/js/l10n.js');
      dependencies.push('/shared/js/l10n_date.js');
    }

    LazyLoader.load(dependencies, () => {
      ['/shared/js/async_storage.js',
       '/shared/js/contacts/import/utilities/config.js',
       '/contacts/js/utilities/extract_params.js',
       '/contacts/js/utilities/cookie.js',
       '/contacts/js/main_navigation.js',
       '/shared/js/contact_photo_helper.js'].forEach((src) => {
        var scriptNode = document.createElement('script');
        scriptNode.src = src;
        scriptNode.setAttribute('defer', true);
        document.head.appendChild(scriptNode);
      });
      return LazyLoader.load('/contacts/js/contacts.js');
    });
  }

  /**
   * Bootstrap process
   * -----------------
   *  In order to provide an acceptable start up time, the contacts app
   *  keeps a cached version of the list view HTML in localStorage. We
   *  initially load only the scripts that are needed to recover the cached
   *  HTML from localStorage and to apply it as part of the contacts list view.
   *  Once we have done this and have shown the cached version of the list in
   *  the screen, we load the rest of required JS files and continue the normal
   *  start up process.
   *
   *  For now, the cache is evicted in the following scenarios:
   *  - oncontactchange event (addition, edition or deletion of contacts).
   *  - ICE contacts enabled/disabled.
   *  - Facebook import enabled/disabled/sync.
   *  - Import from external source (Gmail, Hotmail, Sdcard...).
   *  - Favorites added/removed.
   *  - Change in the way we display contacts (order by last name).
   *  - Locale change (from RTL to LTR and viceversa).
   */

  window.addEventListener('DOMContentLoaded', function ondomloaded() {
    utils.PerformanceHelper.domLoaded();
    window.removeEventListener('DOMContentLoaded', ondomloaded);

    Cache.apply('firstChunk');

    window.onload = () => {
      utils.PerformanceHelper.visuallyComplete();
      loadScripts();
    };
  });

})(window);
