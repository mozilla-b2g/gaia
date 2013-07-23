(function() {

  function SmartFolderIcon(result) {

    this._descriptorIdentifiers = ['query', 'name'];

    this.imageSrc = result.icon;

    this.descriptor = {
        name: result.title,
        query: result.query,
        renderedIcon: true
    };

    if (result.uri) {
      this.descriptor.uri = result.uri;
      this._descriptorIdentifiers.push('uri');
    }

    if (result.type) {
      this.descriptor.type = result.type;
      this._descriptorIdentifiers.push('type');
    }

    this.app = {};
  }

  SmartFolderIcon.prototype = {

    isOfflineReady: function() {
      return false;
    },

    applyOverflowTextMask: Icon.prototype.applyOverflowTextMask,

    displayRenderedIcon: function() {
      this.img.src = this.imageSrc;
      this.img.style.visibility = 'visible';
    },

    render: function(target) {
      Icon.prototype.render.call(this, target);
    }
  };

  var folder = document.getElementById('smartfolder');
  var folderIcons = folder.querySelector('.icon-list');
  var folderTitle = folder.querySelector('.title');

  var gd = new GestureDetector(folder);
  gd.startDetecting();

  function SmartFolder(elem) {
    this.data = elem.dataset;
    this.query = this.data.query;
  }

  SmartFolder.prototype = {
    show: function() {

      folder.classList.add('open');
      folderTitle.innerHTML = this.data.name;
      folderIcons.innerHTML = '';

      OpenSearchPlugins.getSuggestions(
        'EverythingMe',
        this.data.query,
        12,
        this.renderSuggestions.bind(this)
      );

      OpenSearchPlugins.getSuggestions(
        'Marketplace',
        this.data.query,
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

        result.query = this.query;
        var folderIcon = new SmartFolderIcon(result);

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
  window.SmartFolderIcon = SmartFolderIcon;

}());
