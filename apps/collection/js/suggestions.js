'use strict';
/* global Promise */
/* global eme */

(function(exports) {

  const l10nKey = 'collection-categoryId-';
  var map = Array.prototype.map;

  function Suggestions() {
    this.el = document.getElementById('collections-select');
    this.el.addEventListener('blur', this);
    window.addEventListener('visibilitychange', this);
    this.hide();

    this.load = function suggestions_load(categories) {
      this.clear();

      var deviceLocale = this.toLocaleCode(navigator.mozL10n.language.code);

      return new Promise(function done(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;

        var frag = document.createDocumentFragment();

        // localization. use:
        // 1. name provided by Mozilla l10n team
        // 2. else - if suggestion has correct locale, use it
        // 3. else - ignore the suggestion (do not show in list)
        var localeCategories = [];

        categories.forEach(function each(category) {
          var id = category.categoryId;

          var localeName = navigator.mozL10n.get(l10nKey + id);
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
        if (localeCategories.length < 1) {
          alert(navigator.mozL10n.get('no-available-collections'));
          this.hide();
          this.reject('cancelled');
        } else {
          this.show();
        }
      }.bind(this));
    };
  }

  Suggestions.prototype = {
    handleEvent: function suggestions_handleEvent(e) {
      switch (e.type) {
        case 'visibilitychange':
          if (document.hidden) {
            window.close();
          }
          break;

        case 'blur':
          this.hide();

          var selected = map.call(this.el.querySelectorAll('option:checked'),
            function getId(opt) {
              return Number(opt.dataset.categoryId);
            });

          if (selected.length) {
            this.resolve(selected);
          } else {
            this.reject('cancelled');
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
