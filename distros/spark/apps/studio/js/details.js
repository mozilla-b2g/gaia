/* global
  AutoTheme,
  Edit,
  Generation,
  Main,
  Navigation,
  Storage
*/

(function(exports) {
  'use strict';

  var currentTheme = null;

  var Details = {
    panel: document.getElementById('details'),
    header: document.querySelector('#details gaia-header'),
    title: document.querySelector('#details gaia-header h1'),
    list: document.querySelector('#details gaia-list'),
    autotheme: document.querySelector('#details .autotheme-palette'),
    enableButton: document.getElementById('enable-theme-button'),

    prepareForDisplay: function(params) {
      Array.from(this.list.children).forEach((item) => {
        if (!item.classList.contains('static')) {
          item.remove();
        }
      });

      window.addEventListener('AutoTheme:palette', this.onPalette);

      return Storage.fetchTheme(params.id).then((theme) => {
        currentTheme = theme;
        this.title.textContent = theme.title;
        this.header.setAttr('action', 'back');

        if (theme.autotheme) {
          AutoTheme.fromStorable(theme.autotheme);
        }

        Object.keys(theme.groups).forEach(function(group) {
          var sectionTitle = document.createElement('span');
          sectionTitle.classList.add('group');
          sectionTitle.textContent = group;
          this.list.appendChild(sectionTitle);

          Object.keys(theme.groups[group]).forEach(function(key, index) {
            var link = document.createElement('a');
            link.classList.add('navigation');
            link.dataset.group = group;
            link.dataset.section = key;
            if (index === 0) {
              link.classList.add('first');
            }

            var title = document.createElement('h3');
            title.textContent = key;
            link.appendChild(title);

            var forward = document.createElement('i');
            forward.dataset.icon = 'forward-light';
            link.appendChild(forward);

            this.list.appendChild(link);
          }, this);
        }, this);

        if (currentTheme.manifestURL) {
          this.enableButton.disabled = true;
        } else {
          this.enableButton.disabled = false;
        }
      }).catch(function(error) {
        console.log(error);
      }).then(() => this.panel);
    },

    onPalette() {
      /* no "this" available here. */
      AutoTheme.showPalette(Details.autotheme);
      currentTheme.autotheme = AutoTheme.asStorable();
      Storage.updateTheme(currentTheme);
    },

    refreshTheme: function() {
      return Storage.fetchTheme(currentTheme.id)
            .then((theme) => { currentTheme = theme; });
    },

    installTheme: function() {
      return Generation.installTheme(currentTheme.id)
        .then(this.refreshTheme);
    },

    forkTheme: function() {
      return Main.promptDuplicate().then(function(title) {
        return Storage.forkTheme(currentTheme, title);
      });
    },

    removeTheme: function() {
      return Main.promptDeleteTheme().then(function() {
        return Storage.removeTheme(currentTheme.id);
      });
    }
  };

  Details.panel.addEventListener('click', function(evt) {
    var target = evt.target;

    if (target.dataset.action == 'install') {
      target.disabled = true;
      Details.installTheme().then(() => {

      }).catch(console.error.bind(console));
      return;
    }

    if (target.dataset.action == 'fork') {
      Details.forkTheme().then(function() {
        Main.prepareForDisplay();
        Navigation.pop();
      }).catch(function(error) {
        console.log(error);
      });
      return;
    }

    if (target.dataset.action == 'remove') {
      Details.removeTheme().then(function() {
        Main.prepareForDisplay();
        Navigation.pop();
      }).catch(function(error) {
        console.log(error);
      });
      return;
    }

    if (!target.classList.contains('navigation')) {
      return;
    }

    var targetGroup = target.dataset.group;
    var targetSection = target.dataset.section;
    Navigation.push(Edit.prepareForDisplay({
      theme: currentTheme,
      group: targetGroup,
      section: targetSection
    }));
  });

  Details.header.addEventListener('action', function(evt) {
    if (evt.detail.type != 'back') {
      return;
    }

    Navigation.pop();
  });

  Details.panel.addEventListener('Navigation:pop', function onPop() {
    window.removeEventListener('AutoTheme:palette', Details.onPalette);
    AutoTheme.clean();
    AutoTheme.showPalette(Details.autotheme);
  });

  Details.panel.addEventListener('Navigation:display', function onPop() {
    Details.refreshTheme();
  });

  exports.Details = Details;
})(window);
