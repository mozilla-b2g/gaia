function Checkable(title){

  this.when = {};

  this.dom = {};
  this.dom.checkable = document.createElement('div');
  this.dom.checkable.classList.add('checkable');

  this.dom.title = document.createElement('div');
  this.dom.title.classList.add('title');
  this.dom.title.textContent = title;
  this.dom.checkable.appendChild(this.dom.title);

  this.dom.checkbox = document.createElement('div');
  this.dom.checkbox.classList.add('checkbox');
  this.dom.checkable.appendChild(this.dom.checkbox);

  Utils.onButtonTap(this.dom.checkable, this.toggle.bind(this));
}

Checkable.prototype = {
  toggle: function(){
    this.dom.checkbox.classList.toggle('checked');
    this.when.setChecked(this.dom.checkbox.classList.contains('checked'));
  }
}
