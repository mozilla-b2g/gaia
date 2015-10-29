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
    ListUI.init(params.action);
    ListController.init();

    if (params.action && (params.action === 'delete' ||
      params.action === 'export')) {
      SelectMode.init(params);
    }

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
