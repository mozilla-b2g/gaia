/* global LazyLoader, ListUI, ListController, Cache, utils, SelectMode */
'use strict';

/*
 * This class is the one in charge of loading the minimum set of
 * resources needed for the view to load. Any other JS/CSS/Element
 * not needed in the critical path *must* be lazy loaded when needed.
 *
 * Once localization and all the basic JS/CSS/Elements are loaded,
 * we will initialize UI and Controller. Both JS classes *must* be
 * independent and will communicate through events.
 */

var firstPaintFired = false;

window.addEventListener('DOMContentLoaded', function() {
  utils.PerformanceHelper.domLoaded();
  Cache.apply('firstChunk').then(() => {
    utils.PerformanceHelper.visuallyComplete();
    firstPaintFired = true;
  });
  LazyLoader.load(['/shared/js/l10n.js',
    '/shared/js/l10n_date.js']).then(function() {
    // TODO Add if needed
  });
});

window.addEventListener('load', function() {
  if (!firstPaintFired) {
    utils.PerformanceHelper.visuallyComplete();
  }
  var dependencies = [
    '/shared/js/contacts/import/utilities/misc.js',
    '/contacts/js/activities.js',
    '/contacts/js/navigation.js',
    '/shared/js/contact_photo_helper.js',
    '/shared/js/tag_visibility_monitor.js',
    '/contacts/js/utilities/normalizer.js',
    '/shared/js/component_utils.js',
    '/contacts/services/contacts.js',
    '/contacts/js/header_ui.js',
    '/shared/js/contacts/utilities/templates.js',
    '/shared/js/contacts/contacts_shortcuts.js',
    '/contacts/js/loader.js',
    '/shared/js/text_normalizer.js',
    '/shared/js/contacts/utilities/dom.js',
    '/contacts/js/utilities/cookie.js',
    '/shared/js/contacts/import/utilities/config.js',
    '/shared/js/async_storage.js',
    '/shared/js/contacts/search.js',
    '/contacts/js/param_utils.js',
    '/contacts/views/list/js/select_mode.js',
    '/contacts/views/list/js/list_controller.js',
    '/contacts/views/list/js/list_ui.js',
    '/contacts/views/list/js/list_utils.js'
  ];

  LazyLoader.load(dependencies).then(function() {
    utils.PerformanceHelper.contentInteractive();
    utils.PerformanceHelper.chromeInteractive();

    ListController.init();
    ListUI.init();

    /*
     * We have 2 ways of retrieving params:
     * - Through URL params
     * This is the case when calling ICE, due to we are using
     * the activity URL, and the 'action' is a param
     * - When exporing/importing
     * This should be moved to URL params, but we need
     * to get rid of the <iframe> and curtain first. More
     * details in the following bug:
     * https://bugzilla.mozilla.org/show_bug.cgi?id=1183561
     */


    // Retrieve (if any) params in the URL
    function getParams() {
      var params = {};
      var raw = window.location.search.split('?')[1];
      if (!raw) {
        return {};
      }
      var pairs = raw.split('&');
      var pairsLength = pairs.length;
      for (var i = 0; i < pairsLength; i++) {
        var data = pairs[i].split('=');
        params[data[0]] = data[1];
      }
      return params;
    }

    var params = getParams();
    params && params.action && ListUI.initAction(params.action);

    // Retrieve (if any) params coming from export/import/delete
    // after using Settings view.
    window.addEventListener('pageshow', function() {
      var action = sessionStorage.getItem('action');
      if (!action || action === '' || action == 'null') {
        return;
      }

      switch(action) {
        case 'delete':
          ListUI.initAction(action);
          SelectMode.init({action: action});
          break;
        case 'export':
          ListUI.initAction(action);
          SelectMode.init(
            {
              action: action,
              destination: sessionStorage.getItem('destination') || '',
              iccId: sessionStorage.getItem('iccId') || ''
            }
          );
          sessionStorage.setItem('destination', null);
          sessionStorage.setItem('iccId', null);
          break;
      }
      sessionStorage.setItem('action', null);
    });

    navigator.mozSetMessageHandler(
      'activity',
      function(activity) {
        ListController.setActivity(
          activity
        );
      }
    );
  });
});
