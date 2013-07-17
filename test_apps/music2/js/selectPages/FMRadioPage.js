var FMRadioPage = function(pageBridge){
  this.pageBridge = pageBridge;
  Utils.loadDomIds(this, [
      'FMRadioPage',
      'selectSourcePages'
  ]);
  this.dom.page = this.dom.FMRadioPage;
}

FMRadioPage.prototype = {
  name: "FM Radio",
  activate: function(){
    this.dom.selectSourcePages.removeChild(this.dom.page);
    this.pageBridge.setPageDiv(this.dom.page);
  },
  deactivate: function(){
    this.dom.page.parentNode.removeChild(this.dom.page);
    this.dom.selectSourcePages.appendChild(this.dom.page);
  }
}

