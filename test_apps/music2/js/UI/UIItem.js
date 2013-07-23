var UIItem = function(icon, content, more, primaryButton){
  this.icon = icon;
  this.content = content;
  this.more = more;
  this.primaryButton = primaryButton;

  this.dom = {};

  this.data = {};
}

UIItem.prototype = {
  setIcon: function(newIcon){
    Utils.empty(this.dom.icon);
    if (typeof this.icon === 'string'){
      this.dom.icon.classList.remove(this.icon);
    }
    if (!newIcon)
      return;
    this.icon = newIcon;
    if (typeof this.icon === 'string'){
      this.dom.icon.classList.add(this.icon);
    }
    else {
      this.dom.icon.appendChild(this.icon);
    }
  },
  createDiv: function(){
    var div = Utils.classDiv('uiItem');

    this.dom.icon = document.createElement('div');
    this.dom.icon.classList.add('icon');
    this.setIcon(this.icon);
    div.appendChild(this.dom.icon);

    var content = document.createElement('div');
    content.classList.add('content');
    content.appendChild(this.content);
    div.appendChild(content);
    
    if (this.more !== null){
      var toggleMore = document.createElement('div');
      toggleMore.classList.add('toggleMore');
      div.appendChild(toggleMore);

      var more = document.createElement('div');
      more.classList.add('more');
      more.classList.add('hidden');
      more.appendChild(this.more);
      div.appendChild(more);

      Utils.onButtonTap(toggleMore, function(){
        more.classList.toggle('hidden');
        toggleMore.classList.toggle('unhide');
      }.bind(this));
    }

    if (this.primaryButton){
        var primaryButton = document.createElement('div');
        primaryButton.classList.add('primaryButton');
        primaryButton.appendChild(this.primaryButton);
        if (this.more === null){
          primaryButton.classList.add('full');
        }
        div.appendChild(primaryButton);
    }
    else {
      content.classList.add('noButtons');
    }

    this.dom.div = div;
    this.dom.content = content;
    this.dom.more = more;
    this.dom.primaryButton = primaryButton;


    return div;
  }
}
