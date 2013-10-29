var MediaLibraryPanelManager = function(){
  this.panels = [];
  Utils.loadDomIds(this, [
      'visiblePanel',
      'hiddenPanels'
  ]);
}

MediaLibraryPanelManager.prototype = {
  name: 'MediaLibraryPanelManager',
  pushPanel: function(panel){
    this.panels.unshift(panel);
    this._showPanel(panel);
    if (this.panels[1])
      this._hidePanel(this.panels[1]);
  },
  popPanel: function(){
    if (this.panels.length > 1){
      var nowGone = this.panels.shift();
      this._hidePanel(nowGone);
      nowGone.unload();
      var current = this.panels[0];
      this._showPanel(current);
    }
  },
  updateMode: function(mode){
    this.panels.forEach(function(panel){ panel.updateMode(mode); });
  },
  _hidePanel: function(panel){
    var container = panel.getContainer();
    if (container.parentNode)
      container.parentNode.removeChild(container);
    this.dom.hiddenPanels.appendChild(container);
  },
  _showPanel: function(panel){
    var container = panel.getContainer();
    if (container.parentNode)
      container.parentNode.removeChild(container);
    this.dom.visiblePanel.appendChild(container);
  }
}

