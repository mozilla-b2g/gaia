'use strict';
/* global Promise */
/* global eme */

(function(exports) {

  const l10nKey = 'categoryId-';

  var _ = navigator.mozL10n.get;
  var map = Array.prototype.map;

  function Suggestions() {
    this.el = document.getElementById('collections-select');
    this.el.addEventListener('blur', this);
    this.el.addEventListener('change', this);
    this.hide();

    this.load = function suggestions_load(categories) {
      this.clear();

      var deviceLocale = this.toLocaleCode(navigator.mozL10n.language.code);

      return new Promise(function done(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;

        var frag = document.createDocumentFragment();
        var custom = document.createElement('option');
        custom.value = 'custom';

        custom.textContent = _('custom');
        frag.appendChild(custom);

        // localization. use:
        // 1. name provided by Mozilla l10n team
        // 2. else - if suggestion has correct locale, use it
        // 3. else - ignore the suggestion (do not show in list)
        var localeCategories = [];

        categories.forEach(function each(category) {
          var id = category.categoryId;

          var localeName = _(l10nKey + id);
          if (!localeName) {
            var categoryLocale = this.toLocaleCode(category.locale);
            if (categoryLocale === deviceLocale) {
              localeName = category.query;
            } else {
              eme.warn(
                'suggestion ignored (wrong locale ' + categoryLocale + ')',
                id, category.query);
            }
          }

          if (localeName) {
            localeCategories.push({id: id, name: localeName});
          }

        }, this);

        // sort suggestions by localized names
        localeCategories.sort(function sort(a,b) {
          return a.name > b.name;
        });

        localeCategories.forEach(function each(category) {
          var el = document.createElement('option');

          el.value = el.textContent = category.name;
          el.dataset.categoryId = category.id;

          frag.appendChild(el);
        });

        this.el.appendChild(frag);
        this.show();
      }.bind(this));
    };
  }

  Suggestions.prototype = {
    handleEvent: function suggestions_handleEvent(e) {
      var customSelected =
        this.el.querySelectorAll('option[value="custom"]:checked').length;

      switch (e.type) {
        case 'blur':
          this.hide();

          if (!customSelected) {
            var selected = map.call(this.el.querySelectorAll('option:checked'),
              function getId(opt) {
                return Number(opt.dataset.categoryId);
              });

            if (selected.length) {
              this.resolve(selected);
            } else {
              this.reject('cancelled');
            }
          }
          break;

        case 'change':
          if (customSelected) {
            this.hide();

            var query = window.prompt(_('prompt-create-custom'));
            if (query) {
              this.resolve(query);
            } else {
              this.reject('cancelled');
            }
          }
          break;
      }
    },
    clear: function suggestions_clear() {
      this.el.innerHTML = '';
    },
    show: function suggestions_show() {
      this.el.style.display = 'block';
      this.el.focus();
    },
    hide: function suggestions_hide() {
      this.el.blur();
    },
    toLocaleCode: function toLocaleCode(s) {
       return s ? s.substr(0, 2) : undefined;
    }
  };

  exports.Suggestions = new Suggestions();

})(window);
