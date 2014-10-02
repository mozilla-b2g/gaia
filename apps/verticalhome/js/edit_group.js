'use strict';

/* global LazyLoader */

(function(exports) {

  var resources = ['shared/style/input_areas.css', 'style/css/edit_group.css'];
  
  function GroupEditor() {
    this.container = document.getElementById('edit-group');
    this.header = document.getElementById('edit-group-header');
    this.save = document.getElementById('edit-group-save');
    this.form = this.container.querySelector('form');
    this.clear = document.getElementById('edit-group-title-clear');
    this.nameField = document.getElementById('edit-group-title');
  }

  GroupEditor.prototype = {
    handleEvent: function(e) {
      switch(e.type) {
        case 'click':
        case 'submit':
          this.group.name = this.nameField.value;
          this.close();
          break;

        case 'action':
        case 'hashchange':
          this.nameField.blur();
          this.close();
          break;

        case 'touchstart':
          e.preventDefault();
          this.nameField.value = '';
          this.checkSaveAction();
          break;
        
        case 'input':
          this.checkSaveAction();
          break;
      }
    },

    edit: function(group) {
      LazyLoader.load(resources, () => {
        this.group = group;
        this.attachHandlers();
        this.nameField.value = group.name || '';
        this.checkSaveAction();
        document.body.classList.add('edit-group');
        this.container.hidden = false;
        setTimeout(() => {
          this.nameField.focus();
        });
      });
    },

    close: function() {
      this.removeHandlers();
      this.container.hidden = true;
      document.body.classList.remove('edit-group');
    },

    checkSaveAction: function() {
      var name = this.nameField.value.trim();
      this.save.disabled = name === this.group.name;
    },

    attachHandlers: function() {
      this.header.addEventListener('action', this);
      this.save.addEventListener('click', this);
      this.form.addEventListener('input', this);
      this.form.addEventListener('submit', this);
      this.clear.addEventListener('touchstart', this);
      window.addEventListener('hashchange', this);
    },

    removeHandlers: function() {
      this.header.removeEventListener('action', this);
      this.save.removeEventListener('click', this);
      this.form.removeEventListener('input', this);
      this.form.removeEventListener('submit', this);
      this.clear.removeEventListener('touchstart', this);
      window.removeEventListener('hashchange', this);
    },

    get hidden() {
      return this.container.hidden;
    }
  };

  exports.groupEditor = new GroupEditor();

})(window);
