var MediaLibraryPageNotifications = function(){
  Utils.loadDomIds(this, [
      'mediaLibraryPagePanelNotifications',
  ]);
  this.dom.panel = this.dom.mediaLibraryPagePanelNotifications;

  this.hideTimeout = null;
}

MediaLibraryPageNotifications.prototype = {
  show: function(time){
    this.dom.panel.classList.remove('up');
    if (this.hideTimeout)
      clearTimeout(this.hideTimeout);
    this.hideTimeout = null;
    if (time){
      this.hideTimeout = setTimeout(function(){
        this.hide();
      }.bind(this), time);
    }
  },
  hide: function(){
    this.dom.panel.classList.add('up');
  },
  empty: function(){
    Utils.empty(this.dom.panel);
  },
  append: function(div){
    this.dom.panel.appendChild(div);
  },
  showText: function(text){
    this.empty();
    var div = Utils.classDiv('text');
    div.textContent = text;
    this.append(div);
    this.show();
  },
  alert: function(text, time){
    this.empty();
    var div = Utils.classDiv('text');
    div.textContent = text;
    this.append(div);
    this.show(time);
  },
  askForRefresh: function(numberCreated, numberDeleted, refreshFn){
    var question = Utils.classDiv('question');
    var text = '';
    if (numberCreated > 0){
      if (numberCreated === 1)
        text += ' song added,<br>';
      else 
        text += numberCreated + ' songs added,<br>';
    }
    if (numberDeleted > 0){
      if (numberDeleted === 1)
        text += '1 song removed,<br>';
      else 
        text += numberDeleted + ' songs removed,<br>';
    }
    text += 'refresh?';
    question.innerHTML = text;
    var yes = Utils.classDiv('yes');
    var no = Utils.classDiv('no');

    this.empty();
    this.append(no);
    this.append(question);
    this.append(yes);
    this.show();

    Utils.onButtonTap(yes, refreshFn);
    Utils.onButtonTap(no, this.hide.bind(this));
  }
}
