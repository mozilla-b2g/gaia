'use strict';
/* global Promise */


(function(exports) {

  var _ = navigator.mozL10n.get;
  var _map = Array.prototype.map;

  var WORLDWIDE_LOCALE = 'en_WW';

  // TODO
  // translate collections names when device language changes (requires server
  // side changes)
  //

  function Suggestions(categories) {
    this.el = document.getElementById('collections-select');
    this.el.addEventListener('blur', this);
    this.el.addEventListener('change', this);
    this.hide();

    this.load = function suggestions_load(categories, locale) {
      var self = this;

      this.clear();

      return new Promise(function done(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;

        var doTranslate = locale !== WORLDWIDE_LOCALE;
        var frag = document.createDocumentFragment();
        var custom = document.createElement('option');
        custom.value = 'custom';

        custom.textContent = _('custom');
        frag.appendChild(custom);

        if (doTranslate) {
          // TODO
          // see bug 968998
          // translate and sort categories
        }

        // filter installed categories
        CollectionsDatabase.getAllCategories()
          .then(function filter(installed) {
            categories.forEach(function each(category) {
              if (installed.indexOf(category.categoryId) > -1) {
                return;
              }

              var el = document.createElement('option');

              el.value = el.textContent = category.query;
              el.dataset.query = category.query;
              el.dataset.categoryId = category.categoryId;

              frag.appendChild(el);
            });

            self.el.appendChild(frag);
            self.show();

          }, reject);
      }.bind(this));
    }
  };

  Suggestions.prototype = {
    handleEvent: function suggestions_handleEvent(e) {
      var customSelected =
        this.el.querySelectorAll('option[value="custom"]:checked').length;

      switch (e.type) {
        case 'blur':
          this.hide();

          if (!customSelected) {
            var selected = _map.call(this.el.querySelectorAll('option:checked'),
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
    }
  };

  exports.Suggestions = new Suggestions();
})(window);
