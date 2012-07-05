'use strict';

if (!window['Gaia'])
  var Gaia = {};

const TASK_ICONS = ['task_ta.png'];

var TaskList = {

  get tasks() {
    delete this.tasks;
    return this.tasks = document.getElementById('tasks');
  },

  get title() {
    delete this.title;
    return this.title = document.getElementById('tasks-title');
  },

  get loading() {
    delete this.loading;
    return this.loading = document.getElementById('tasks-loading');
  },

  handleEvent: function(evt) {
    if (evt.type != 'click')
      return;

    var link = evt.target;
    if (!link)
      return;

    switch (link.id) {
      case 'tasks-reset':
        this.refresh();
        break;
      default:
        EditTask.load(EditTask.taskFromDataset(link.parentNode.dataset));
    }
  },

  init: function() {
    this.loading.classList.remove('hidden');
    TasksDB.load();
  },

  refresh: function() {
    if (this.tasks.hasChildNodes()) {
      while (this.tasks.childNodes.length >= 1) {
        this.tasks.removeChild(this.tasks.firstChild);
      }
    }

    this.loading.classList.remove('hidden');

    TasksDB.load();
  },

  fill: function(taskDataList) {
    var self = this;

    taskDataList.forEach(function(task) {

      var li = document.createElement('li');
      var a = document.createElement('a');
      a.dataset.id = 'task-' + task.id;
      a.dataset.name = task.name;
      a.dataset.desc = task.desc;
      a.dataset.done = task.done;

      a.href = '#task';

      li.appendChild(a);

      var img = document.createElement('img');
      img.src = task.done ?
        'style/icons/done_' + TASK_ICONS[0] :
        'style/icons/' + TASK_ICONS[0];
      a.appendChild(img);

      var nameSpan = document.createElement('span');
      nameSpan.textContent = task.name;
      a.appendChild(nameSpan);

      var label = document.createElement('label');
      label.classList.add('text');

      a.appendChild(label);

      a.addEventListener('click', TaskList);

      self.tasks.appendChild(li);
    });

    this.loading.classList.add('hidden');
  }
};

var EditTask = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('task');
  },

  get nameInput() {
    delete this.nameInput;
    return this.nameInput = document.querySelector('input[name=\'task.name\']');
  },

  get descInput() {
    delete this.descInput;
    return this.descInput =
      document.querySelector('textarea[name=\'task.desc\']');
  },

  get doneInput() {
    delete this.doneInput;
    return this.doneInput = document.querySelector('input[name=\'task.done\']');
  },

  get taskTitle() {
    delete this.taskTitle;
    return this.taskTitle = document.getElementById('task-title');
  },

  get deleteElement() {
    delete this.deleteElement;
    return this.deleteElement = document.querySelector('li.delete');
  },

  handleEvent: function(evt) {
    if (evt.type != 'click')
      return;

    var input = evt.target;
    if (!input)
      return;

    switch (input.id) {
      case 'task-save':
        if (!this.updateCurrent()) {
          evt.preventDefault();
          return false;
        }
        break;
      case 'task-del':
        this.deleteCurrent();
        break;
    }
  },

  taskFromDataset: function(dataset) {
    var task = {};

    task.id = dataset.id;
    task.name = dataset.name ? dataset.name : '';
    task.desc = dataset.desc ? dataset.desc : '';
    task.done = dataset.done == 'true' ? true : false;

    return task;
  },

  load: function(task) {

    // Reset the required message to blank
    this.nameInput.nextElementSibling.innerHTML = '';

    // Set the values
    this.element.dataset.id = task.id;
    this.nameInput.value = task.name;
    this.descInput.value = task.desc;
    this.doneInput.checked = task.done;

    if (task.id) {
      this.taskTitle.innerHTML = 'Edit Task';
      this.deleteElement.style.display = 'block';
    } else {
      this.taskTitle.innerHTML = 'New Task';
      this.deleteElement.style.display = 'none';
    }
  },

  updateCurrent: function() {

    var task = {};

    if (this.element.dataset.id != 'undefined' &&
        this.element.dataset.id != '') {
      task.id = parseInt(this.element.dataset.id.substring(5));
    }

    var error = false;

    task.name = this.nameInput.value;
    task.desc = this.descInput.value;
    task.done = this.doneInput.checked;

    if (!task.name) {
      this.nameInput.nextElementSibling.textContent = 'Required';
      error = true;
    }

    if (!error) {
      TasksDB.put(task);
    }

    return !error;
  },

  deleteCurrent: function() {
    if (this.element.dataset.id != '') {
      var id = parseInt(this.element.dataset.id.substring(5));
      TasksDB.delete(id);
    }
  }

};

var TasksDB = {

  DBNAME: 'tasks',
  STORENAME: 'tasks',

  // Database methods
  load: function() {
    SimpleDB.query(this.DBNAME, this.STORENAME, SimpleDB.load,
      this.loadSuccess);
  },

  put: function(task) {
    SimpleDB.query(this.DBNAME, this.STORENAME, SimpleDB.put,
      this.putSuccess, task);
  },

  delete: function(key) {
    SimpleDB.query(this.DBNAME, this.STORENAME, SimpleDB.delete,
      this.deleteSuccess, key);
  },

  putSuccess: function(task) {
    TaskList.refresh();
  },

  loadSuccess: function(tasks) {
    TaskList.fill(tasks);
  },

  deleteSuccess: function() {
    TaskList.refresh();
  }
};

window.addEventListener('DOMContentLoaded', function() {
  document.querySelector('#task-new').addEventListener('click', TaskList);

  document.querySelector('#task-save').addEventListener('click', EditTask);
  document.querySelector('#task-del').addEventListener('click', EditTask);

  TaskList.init();
});

window.addEventListener('keyup', function goBack(event) {
  if (document.location.hash != '#root' &&
      event.keyCode === event.DOM_VK_ESCAPE) {

    event.preventDefault();
    event.stopPropagation();

    document.location.hash = 'root';
  }
});
