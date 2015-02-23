define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DefaultLaunch = require('panels/app_default_launch/app_default_launch');

  return function ctor_default_launch_panel() {
    var _defaultAppModule = DefaultLaunch();

    var _listDOM;

        /** _listData is an array of actions with default app set
          *           Contains objects like:
          * {
          *   'manifestURL': app://<name>.gaiamobile.org/manifest.webapp,
          *   'name': <name>
          *   'activity': {
          *     name: 'pick',
          *     type: ['image/jpeg',
          *            'image/png',
          *            'image/gif',
          *            'image/bmp'],
          *     l10nId: 'default-activity-pickimage',
          *     settingsId: 'default.activity.pickimage'
          *   }
          * }
          */
    var _listData;

    function _render() {
      _listDOM.innerHTML = '';

      var listFragment = document.createDocumentFragment();
      if (_listData.length) {
        // create a link for each item on the list
        _listData.forEach((action) => {
          var item = document.createElement('li'),
              link = document.createElement('a'),
              act = document.createElement('span'),
              app = document.createElement('small');

          act.setAttribute('data-l10n-id', action.activity.l10nId);
          app.textContent = action.name; // no translation, it's an app name

          link.href = '#';
          link.classList.add('menu-item');
          link.setAttribute('data-manifest', action.manifestURL);
          link.appendChild(act);
          link.appendChild(app);
          item.appendChild(link);
          listFragment.appendChild(item);
        });
      } else {
        // empty list, just show a message
        var emptyItem = document.createElement('li'),
            message = document.createElement('span');

        message.classList.add('empty-list');
        message.setAttribute('data-l10n-id', 'appManager-defaultLaunch-empty');
        emptyItem.appendChild(message);

        listFragment.appendChild(emptyItem);
      }

      _listDOM.appendChild(listFragment);
    }

    return SettingsPanel({

      onInit: function(panel) {
        _listData = [];
        _listDOM = panel.querySelector('.default-list');
        _defaultAppModule.init(_listDOM);
      },

      onBeforeShow: function() {
        // return a promise so we make sure that it's done before onShow
        return _defaultAppModule.getAll().then((newList) => {
          _listData = newList;
        });
      },

      onShow: function() {
        _render();
      },
    });
  };
});
