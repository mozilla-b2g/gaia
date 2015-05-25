/*global
  AutoTheme,
  Defer,
  Details,
  Navigation,
  Storage,
  ThemeCreator
*/
(function(exports) {
  'use strict';

  var Main = {
    panel: document.getElementById('main'),
    header: document.querySelector('#main gaia-header'),
    title: document.querySelector('#main gaia-header h1'),
    createDialog: document.getElementById('new-theme-dialog'),
    createDialogInput: document.querySelector('.new-theme-title-input'),
    createDialogConfirm: document.querySelector('#new-theme-dialog .confirm'),
    autotheme: document.querySelector('#new-theme-dialog .autotheme-palette'),
    deleteDialog: document.getElementById('delete-theme-dialog'),
    duplicateDialog: document.getElementById('duplicate-theme-dialog'),
    duplicateDialogInput: document.querySelector('.duplicate-theme-title-input'),
    duplicateDialogConfirm: document.
      querySelector('#duplicate-theme-dialog .confirm'),

    prepareForDisplay: function(params) {
      var currentList = this.panel.querySelector('gaia-list');
      if (currentList) {
        this.panel.removeChild(currentList);
      }

      Storage.fetchThemesList().then((themes) => {
        var list = document.createElement('gaia-list');
        themes.forEach(function(theme) {
          var link = document.createElement('a');
          link.classList.add('navigation');
          link.dataset.themeId = theme.id;

          var title = document.createElement('h3');
          title.textContent = theme.title;
          link.appendChild(title);

          var forward = document.createElement('i');
          forward.dataset.icon = 'forward-light';
          link.appendChild(forward);

          list.appendChild(link);
        });

        this.panel.appendChild(list);
      }).catch(function(error) {
        console.log(error);
      });

      this.createDialogInput.addEventListener('input', () => {
        this.createDialogConfirm.disabled = this.createDialogInput.value === '';
      });

      this.duplicateDialogInput.addEventListener('input', () => {
        this.duplicateDialogConfirm.disabled =
          this.duplicateDialogInput.value === '';
      });

      return this.panel;
    },

    promptDeleteTheme: function() {
      this.deleteDialog.open();
      this.deleteDialogDefer = new Defer();
      return this.deleteDialogDefer.promise;
    },

    closeDeleteDialog: function() {
      this.deleteDialog.close();
      this.deleteDialogDefer = null;
    },

    onDeleteDialogCancelClicked: function() {
      this.closeDeleteDialog();
    },

    onDeleteDialogClicked: function() {
      this.deleteDialogDefer.resolve();
      this.closeDeleteDialog();
    },

    promptDuplicate: function() {
      this.duplicateDialog.open();
      this.duplicateDialogDefer = new Defer();
      return this.duplicateDialogDefer.promise;
    },

    closeDuplicateDialog: function() {
      this.duplicateDialog.close();
      this.duplicateDialogInput.value = '';
      this.duplicateDialogDefer = null;
    },

    onDuplicateDialogCancelClicked: function() {
      this.closeDuplicateDialog();
    },

    onDuplicateDialogClicked: function() {
      var title = this.duplicateDialogInput.value;
      this.duplicateDialogDefer.resolve(title);
      this.closeDuplicateDialog();
    },

    createTheme: function() {
      this.promptNewTheme().then((theme) => {
        if (!theme.title) {
          throw new Error('No title has been set !');
        }

        theme = ThemeCreator.template(theme);

        Storage.createTheme(theme).then(() => {
          this.prepareForDisplay();
        }).catch(function(error) {
          console.log(error);
        });
      });
    },

    promptNewTheme() {
      window.addEventListener('AutoTheme:palette', this.onPalette);
      this.createDialog.open();
      this.createDialogDefer = new Defer();
      return this.createDialogDefer.promise;
    },

    closeCreateDialog() {
      this.createDialog.close();
      this.createDialogInput.value = '';
      window.removeEventListener('AutoTheme:palette', this.onPalette);
      AutoTheme.clean();
      this.onPalette();
      this.createDialogDefer = null;
    },

    onPalette() {
      // no "this" available here
      AutoTheme.showPalette(Main.autotheme);
    },

    onCreateDialogCancelClicked() {
      this.closeCreateDialog();
    },

    onCreateDialogCreateClicked() {
      var result = {
        title: this.createDialogInput.value,
        autotheme: AutoTheme.asStorable(),
        palette: AutoTheme.palette
      };
      this.createDialogDefer.resolve(result);
      this.closeCreateDialog();
    }
  };

  Main.panel.addEventListener('click', function(evt) {
    var target = evt.target;
    if (target.dataset.action == 'create') {
      Main.createTheme();
      return;
    }

    if (!target.classList.contains('navigation')) {
      return;
    }

    var themeId = parseInt(target.dataset.themeId);
    Navigation.push(Details.prepareForDisplay({
      id: themeId
    }));
  });

  document.getElementById('add-theme-button').addEventListener(
    'click', () => Main.createTheme()
  );

  Main.createDialog.querySelector('.cancel').addEventListener(
    'click', () => Main.onCreateDialogCancelClicked()
  );

  Main.createDialog.querySelector('.confirm').addEventListener(
    'click', () => Main.onCreateDialogCreateClicked()
  );

  Main.deleteDialog.querySelector('.cancel').addEventListener(
    'click', () => Main.onDeleteDialogCancelClicked()
  );

  Main.deleteDialog.querySelector('.confirm').addEventListener(
    'click', () => Main.onDeleteDialogClicked()
  );

  Main.duplicateDialog.querySelector('.cancel').addEventListener(
    'click', () => Main.onDuplicateDialogCancelClicked()
  );

  Main.duplicateDialog.querySelector('.confirm').addEventListener(
    'click', () => Main.onDuplicateDialogClicked()
  );

  exports.Main = Main;
})(window);
