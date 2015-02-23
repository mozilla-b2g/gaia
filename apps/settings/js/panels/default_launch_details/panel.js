define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DefaultLaunchDetails =
    require('panels/default_launch_details/default_launch_details');

  return function ctor_default_launch_details_panel() {
    var _defaultDetailsModule = DefaultLaunchDetails();

    var _activity,//_activityName,
        _settingId,
        _chosenManifest,
        _appList,
        _elements;

    function itemTemplate(name, manifestURL) {
      // l10nId in the form of default-activity-name
      // settingId in the form of default.activity.name
      var RADIO_GROUP = _settingId;

      var container = document.createElement('li'),
          label = document.createElement('label'),
          radio = document.createElement('input'),
          text = document.createElement('span');

      label.className = 'pack-radio';

      radio.type = 'radio';
      radio.name = RADIO_GROUP;
      radio.value = manifestURL;
      radio.checked = manifestURL === _chosenManifest;

      label.appendChild(radio);
      label.appendChild(text);
      container.appendChild(label);
      text.textContent = name;

      radio.onclick = function(evt) {
        var input = evt.target;
        if (input.checked) {
          _defaultDetailsModule.setNewDefaultApp(input.name, input.value);
        }
      };

      return container;
    }

    function _render() {
      _elements.list.innerHTML = '';
      _elements.panelTitle.setAttribute('data-l10n-id', _activity.l10nId);
      var listFragment = document.createDocumentFragment();

      // we need to add an element to erase the current value
      var noneElement = itemTemplate(navigator.mozL10n.get('none'), null);
      listFragment.appendChild(noneElement);

      _appList.forEach((app) => {

        var li = itemTemplate(app.name, app.manifestURL);
        listFragment.appendChild(li);
      });

      _elements.list.appendChild(listFragment);
    }

    return SettingsPanel({

      onInit: function(panel, options) {
        _activity = options && options.activity || null;
        // _activityName = options && options.activity.l10nId || null;
        _settingId = options && options.activity.settingsId || null;
        _chosenManifest = options && options.manifestURL || null;
        _appList = [];
        _elements = {
          panelTitle: panel.querySelector('.panel-title'),
          list: panel.querySelector('.details-list')
        };
      },

      onBeforeShow: function() {
        // return a promise so onShow is not called till is finished
        return _defaultDetailsModule.loadApps(_activity).then((list) => {
          _appList = list;
        });
      },

      onShow: function() {
        _render();
      },
    });
  };
});
