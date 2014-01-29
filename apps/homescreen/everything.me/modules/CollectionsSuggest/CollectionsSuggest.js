'use strict';

Evme.CollectionsSuggest = new function Evme_CollectionsSuggest() {
  var NAME = 'CollectionsSuggest',
      CUSTOM_OPT_VALUE = 'customCollectionValue',
      CUSTOM_OPT_ID = 'custom-collection',
      self = this,
      elList = null,
      elParent = null,
      active = false,
      savedIcons = null,
      WORLDWIDE_LOCALE = 'en_WW';

  this.init = function init(options) {
    elParent = options.elParent;

    elList = options.elList;
    elList.addEventListener('blur', onBlur);
    elList.addEventListener('change', onChange);

    Evme.EventHandler.trigger(NAME, 'init');
  };

  this.show = function show() {
    if (active) {
      return false;
    }

    active = true;
    elList.classList.add('visible');
    elList.focus();
    Evme.EventHandler.trigger(NAME, 'show');

    return true;
  };

  this.hide = function hide() {
    if (!active) {
      return false;
    }

    active = false;
    elList.classList.remove('visible');
    window.focus();
    elList.blur();

    Evme.EventHandler.trigger(NAME, 'hide');

    return true;
  };

  this.newCustom = function newCustom() {
    elList.blur();
    var customQuery = prompt(Evme.Utils.l10n(NAME, 'prompt-create-custom'));

    if (!customQuery) {
      return;
    }

    Evme.EventHandler.trigger(NAME, 'custom', {
      'query': customQuery
    });
  };

  this.get = function get() {
    var selectedShortcuts = [],
        elShourtcuts = Evme.$('option', elList);

    for (var i = 0, elOption; elOption = elShourtcuts[i++];) {
      if (elOption.selected) {
        selectedShortcuts.push({
          'query': elOption.value,
          'experienceId': elOption.dataset.experience || ''
        });
      }
    }

    return selectedShortcuts;
  };

  this.load = function load(data) {
    savedIcons = data.icons;

    // translate only if locale is supported by E.me service
    var doTranslate = data.locale !== WORLDWIDE_LOCALE;

    elList.innerHTML = '';
    self.add(data.shortcuts, doTranslate);

    Evme.EventHandler.trigger(NAME, 'load');
  };

  this.add = function add(shortcuts, doTranslate) {
    var shortcutsAdded = {};

    elList.innerHTML = '';

    // custom collection
    var optCustom = document.createElement('option');
    optCustom.text = Evme.Utils.l10n('shortcut', 'custom');
    optCustom.value = CUSTOM_OPT_VALUE;
    optCustom.id = CUSTOM_OPT_ID;

    elList.appendChild(optCustom);

    if (doTranslate) {
      for (var i = 0, shortcut, experienceId; shortcut = shortcuts[i++];) {
        experienceId = shortcut.experienceId || '';

        if (experienceId) {
          var l10nkey = 'id-' + Evme.Utils.shortcutIdToKey(experienceId),
              translatedQuery = Evme.Utils.l10n('shortcut', l10nkey);

          if (translatedQuery) {
            shortcut.query = translatedQuery;
          }
        }
      }

      // sort translated queries
      shortcuts.sort(function cmp(a, b) {
        if (a.query > b.query)
          return 1;
        if (a.query < b.query)
          return -1;
        return 0;
      });
    }

    for (var i = 0, shortcut, query, queryKey, experienceId;
                                                  shortcut = shortcuts[i++];) {
      query = shortcut.query;
      queryKey = query.toLowerCase();
      experienceId = shortcut.experienceId || '';

      query = query.replace(/</g, '&lt;');

      if (!shortcutsAdded[queryKey]) {
        var opt = document.createElement('option');
        opt.text = Evme.html(query);
        opt.value = query.replace(/"/g, '&quot;');
        opt.dataset.experience = experienceId;

        elList.appendChild(opt);
        shortcutsAdded[queryKey] = true;
      }
    }
  };

  this.Loading = new function Loading() {
    var active = false,
        ID = 'shortcuts-customize-loading';

    this.show = function loadingShow() {
      if (active) { return; }

      var el = Evme.$create('form',
        {'id': ID, 'role': 'dialog', 'data-type': 'confirm'},
        '<section>' +
        '<h1 ' + Evme.Utils.l10nAttr(NAME, 'loading') + '></h1>' +
        '<p class="noreset">' +
        '<progress></progress>' +
        '</p>' +
        '</section>' +
        '<menu>' +
        '<button ' + Evme.Utils.l10nAttr(NAME, 'loading-cancel') +
        ' class="full"></button>' +
        '</menu>');

      Evme.$('button', el, function onItem(elButton) {
        elButton.addEventListener('click', onLoadingCancel);
      });

      Evme.Utils.getOverlay().appendChild(el);

      active = true;

      Evme.EventHandler.trigger(NAME, 'loadingShow');
    };

    this.hide = function loadingHide() {
      if (!active) { return; }

      Evme.$remove('#' + ID);
      active = false;

      Evme.EventHandler.trigger(NAME, 'loadingHide');
    };
  };

  function isCustomSelected() {
    var optCustom = document.getElementById(CUSTOM_OPT_ID);
    return (optCustom && optCustom.selected);
  }

  function onChange() {
    if (isCustomSelected()) {
      self.newCustom();
    }
  }

  function onBlur() {
    active = false;
    self.Loading.hide();
    Evme.EventHandler.trigger(NAME, 'hide');

    if (!isCustomSelected()) {
      done();
    }
  }

  function onLoadingCancel(e) {
    e.stopPropagation();
    Evme.EventHandler.trigger(NAME, 'loadingCancel', {
      'e': e
    });
  }

  function done() {
    Evme.EventHandler.trigger(NAME, 'done', {
      'shortcuts': self.get(),
      'icons': savedIcons
    });
  }
}
