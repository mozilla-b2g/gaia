(function() {

  var folder = document.getElementById('smartfolder');
  var folderIcons = folder.querySelector('.icon-list');
  var folderTitle = folder.querySelector('.title');

  var gd = new GestureDetector(folder);
  gd.startDetecting();

  function SmartFolder(icon) {
    this.icon = icon;
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
        this.renderSuggestions
      );

      OpenSearchPlugins.getSuggestions(
        'Marketplace',
        this.icon.descriptor.query,
        12,
        this.renderSuggestions
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

        var customContext = {
          name: result.title.substring(0, 10),
          uri: result.uri,
          icon: result.icon,

          // Mock icon methods
          isOfflineReady: function() { return true; }
        };

        Icon.render.apply(customContext, folderIcons);
      });
    }
  };

  window.SmartFolder = SmartFolder;

}());
