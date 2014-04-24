(function(exports) {

  const KEY_ENTER = 13;

  var SearchTool = function() {
    this.searchBox = document.getElementById('test-agent-search-input');
    this.button = document.getElementById('test-agent-search-submit');
    this.content = document.getElementById('test-agent-ui');

    this.button.addEventListener('click', this._onFind.bind(this));
    this.searchBox.addEventListener('keypress', this._onQuery.bind(this));
  };

  SearchTool.prototype._onQuery = function(evt) {
    if (KEY_ENTER === evt.which) {
      evt.preventDefault();
      var text = this.searchBox.value;
      this.searchBox.blur();
      this.content.focus();
      this.find(text);
      return false;
    }
  };

  SearchTool.prototype._onFind = function(evt) {
    var text = this.searchBox.value;
    this.find(text);
    evt.preventDefault();
  };

  SearchTool.prototype.find = function(text) {
    window.find(text, true, true, false);
    console.log('find', text);
  };

  // Must be triggered only after all LI got attached.
  var CategoryGroup = function() {
    window.addEventListener('test-agent-list-done', (function() {
      this.gather().group().render();
    }).bind(this));
  };

  CategoryGroup.prototype._getCategory = function(text) {
    return text.match(/^([^\/]*)\/(.*)$/);
  };

  CategoryGroup.prototype.gather = function() {
    this.lis = document.querySelectorAll('#test-agent-ui li');
    return this;
  };

  CategoryGroup.prototype.group = function() {
    var lis = this.lis;
    var result = {'groups': {}, 'categories': [], 'total': this.lis.length};
    for (var i = 0; i < lis.length; i++) {
      var li = lis[i];
      var text = li.textContent;
      [, cat, truncated] = this._getCategory(text);
      li.textContent = truncated;
      if (result.groups[cat]) {
        result.groups[cat].push(li);
      } else {    // new group.
        result.groups[cat] = [li];
        result.categories.push(cat);
      }
    }
    this.grouped = result;
    return this;
  };

  CategoryGroup.prototype.render = function() {
    var frame = document.querySelector('#test-agent-ui .test-list');
    for (var cat in this.grouped.groups) {
      var lis = this.grouped.groups[cat];
      var head = document.createElement('li');
      head.classList.add('test-agent-list-head');
      head.dataset.category = cat;
      head.textContent = '#' + cat;
      head.addEventListener('click', (function doGroupClick(evt) {
        this.addGroupTest(evt.target.dataset.category);
      }).bind(this));
      info = document.createElement('span');
      info.classList.add('test-agent-list-head-info');
      info.textContent = lis.length + '/' + this.grouped.total;
      head.appendChild(info);
      frame.insertBefore(head, lis[0]);
    }
    return this;
  };

  CategoryGroup.prototype.addGroupTest = function(cat) {
    // Don't want to involve APIs studying so I just forward clicking events.
    this.grouped.groups[cat].forEach(function(li) {
      li.click();
    });
  };

  exports.categoryGroup = new CategoryGroup();
  exports.searchTool = new SearchTool();
})(window);
