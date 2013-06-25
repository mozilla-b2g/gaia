var SourcesMetaDrawer = function(){
  this.dom = {};
  this.dom.sourcesMetaDrawer = document.getElementById('sourcesMetaDrawer');

  this.currentSourceName = null;
  this.activateSources = {};

}

SourcesMetaDrawer.prototype = {
  addSource: function(name, onActivate, onDeactivate){
    var activateSourceDiv = document.createElement('div');
    activateSourceDiv.innerHTML = name;

    this.dom.sourcesMetaDrawer.appendChild(activateSourceDiv);
    this.activateSources[name] = {};
    this.activateSources[name].div = activateSourceDiv;
    this.activateSources[name].onActivate = onActivate || function(){ };
    this.activateSources[name].onDeactivate = onDeactivate || function(){ };

    Utils.onButtonTap(activateSourceDiv, function(){
      this.activateSource(name);
    }.bind(this));
  },
  activateSource: function(name){
    if (this.currentSourceName !== null){
      this.activateSources[this.currentSourceName].div.classList.remove('current');
      this.activateSources[this.currentSourceName].onDeactivate();
    }
    this.activateSources[name].div.classList.add('current');
    this.currentSourceName = name;

    this.activateSources[name].onActivate();
  }
}
