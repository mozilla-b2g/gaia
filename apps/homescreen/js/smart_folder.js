(function() {

  function SmartFolderIcon(result, query) {
    this.imageSrc = result.icon;

    this.descriptor = {
        name: result.title.substring(0, 10),
        query: query,
        uri: result.uri,
        renderedIcon: true
    };
    this.app = {};
  }

  SmartFolderIcon.prototype = {

    _descriptorIdentifiers: ['query', 'uri'],

    isOfflineReady: function() {
      return false;
    },

    applyOverflowTextMask: Icon.prototype.applyOverflowTextMask,

    displayRenderedIcon: function() {
      this.img.src = this.imageSrc;
      this.img.style.visibility = 'visible';
    }
  };

  var folder = document.getElementById('smartfolder');
  var folderIcons = folder.querySelector('.icon-list');
  var folderTitle = folder.querySelector('.title');

  var gd = new GestureDetector(folder);
  gd.startDetecting();

  function SmartFolder(icon) {
    this.icon = icon;
    this.query = this.icon.descriptor.query;
  }

  SmartFolder.prototype = {
    show: function() {

      folder.classList.add('open');
      folderTitle.innerHTML = this.icon.descriptor.name;
      folderIcons.innerHTML = '';

      OpenSearchPlugins.getSuggestions(
        'EverythingMe',
        this.icon.descriptor.query,
        12,
        this.renderSuggestions.bind(this)
      );

      OpenSearchPlugins.getSuggestions(
        'Marketplace',
        this.icon.descriptor.query,
        12,
        this.renderSuggestions.bind(this)
      );

      // Set a listener to close the smart folder
      setTimeout(function() {
        function closeSmartFolder(e) {
          window.removeEventListener('tap', closeSmartFolder);
          folderIcons.removeEventListener('tap', checkFolderIcons);
          folder.classList.remove('open');
        }
        function checkFolderIcons(e) {
          e.stopPropagation();
        }
        window.addEventListener('tap', closeSmartFolder);
        folderIcons.addEventListener('tap', checkFolderIcons);
      }, 0);
    },

    renderSuggestions: function(results) {
      results.forEach(function(result) {

        var folderIcon = new SmartFolderIcon(result, this.query);

        Icon.prototype.render.call(folderIcon, folderIcons);
      }, this);

      folderIcons.addEventListener('click', function(e) {
        if (e.target.dataset.query) {
          new MozActivity({ name: 'view',
                          data: { type: 'url', url: e.target.dataset.uri }});
        }
      });
    }
  };

  window.SmartFolder = SmartFolder;

}());
