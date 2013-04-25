Evme.Helper = new function Evme_Helper() {
  var NAME = "Helper", self = this,
      el = null, elWrapper = null, elList = null,
      _data = {}, defaultText = "", scroll = null, currentDisplayedType = "", timeoutShowRefine = null,
      queryForSuggestions = "", lastVisibleItem, dontClick = false;

  this.init = function init(options) {
    !options && (options = {});        

    el = options.el;
    
    elWrapper = el.parentNode;
    elList = Evme.$('ul', el)[0];
    elInner = elList.parentNode;

    elList.addEventListener('touchend', elementClick, true);

    self.reset();

    scroll = new Scroll(elInner, {
      "vScroll": false,
      "hScroll": true,
      "onTouchStart": onScrollStart,
      "onTouchMove": onScrollMove
    });

    Evme.EventHandler.trigger(NAME, "init");
  };

  this.reset = function reset() {
    _data = {
      "suggestions": [],
      "spelling": [],
      "types": [],
      "history": [],
      "queries": {
        "input": "",
        "parsed": ""
      }
    };
  };

  this.empty = function empty() {
    elList.innerHTML = '<li class="label" ' + Evme.Utils.l10nAttr(NAME, 'default') + '></li>';
    currentDisplayedType && elWrapper.classList.remove(currentDisplayedType);
    Evme.EventHandler.trigger(NAME, 'empty');
  };

  this.clear = function clear() {
    self.empty();
    Evme.EventHandler.trigger(NAME, 'clear');
  };

  this.getElement = function getElement() {
    return el;
  };

  this.getList = function getList() {
    return elList;
  };

  this.load = function load(inputQuery, parsedQuery, suggestions, spelling, types) {
    inputQuery = inputQuery || "";

    types = types || [];

    (typeof suggestions !== "undefined") && (_data.suggestions = suggestions);
    (typeof spelling !== "undefined") && (_data.spelling = spelling);
    (typeof types !== "undefined") && (_data.types = types);

    _data.queries.input = inputQuery;
    _data.queries.parsed = parsedQuery;

    if (_data.suggestions.length > 4) {
      _data.suggestions = _data.suggestions.slice(0, 4);
    }

    var _type = (_data.types && _data.types.length >= 1)? _data.types[0].name : "";

    self.empty();

    cbLoaded(inputQuery, parsedQuery, suggestions, spelling, types);
  };
  
  this.loadSuggestions = function loadSuggestions(suggestions) {
    self.reset();
    self.load("", "", suggestions);
  };

  this.loadHistory = function loadHistory(history) {
    _data.history = history;
  };

  this.showSuggestions = function showSuggestions(querySentWith) {
    querySentWith && (queryForSuggestions = querySentWith);

    if (_data.suggestions.length > 0) {
      if (_data.suggestions.length > 4) {
        _data.suggestions = _data.suggestions.slice(0, 4);
      }
      self.showList({
        "data": _data.suggestions
      });
    }

    Evme.EventHandler.trigger(NAME, "showSuggestions", {
      "data": _data.suggestions
    });
  };

  this.getSuggestionsQuery = function getSuggestionsQuery() {
    return queryForSuggestions;
  };

  this.showHistory = function showHistory() {
    self.showList({
      "data": _data.history,
      "l10nKey": 'history-title',
      "className": "history"
    });

    Evme.EventHandler.trigger(NAME, "showHistory", {
      "data": _data.history
    });
  };

  this.showSpelling = function showSpelling() {
    var list = _data.spelling;
    if (list.length == 0) {
      list = _data.types;
    }

    self.showList({
      "data": list,
      "l10nKey": 'didyoumean-title',
      "className": 'didyoumean'
    });

    Evme.EventHandler.trigger(NAME, "showSpelling", {
      "data": _data.spelling
    });
  };

  this.loadRefinement = function loadRefinement(types) {
    _data.types = types;
  };

  this.showRefinement = function showRefinement() {
    self.showList({
      "data": _data.types,
      "l10nKey": 'refine-title',
      "className": "refine"
    });
    
    Evme.EventHandler.trigger(NAME, "showRefinement", {
      "data": _data.types
    });
  };
  
  this.showList = function showList(data) {
    var classToAdd = data.className || '',
        label = data.l10nKey? Evme.Utils.l10nAttr(NAME, data.l10nKey) : '',
        items = (data.data || []).slice(0),
        html = '';

    self.empty();
    
    classToAdd && elWrapper.classList.add(classToAdd);
    currentDisplayedType = classToAdd;

    if (label) {
      html += '<li class="label" ' + label + '></li>';
    }
    for (var i=0; i<items.length; i++) {
      html += getElement(items[i], i, classToAdd);
    }

    elList.innerHTML = html;

    scroll.scrollTo(0, 0);

    Evme.EventHandler.trigger(NAME, "show", {
      "type": classToAdd,
      "data": items
    });
  };

  this.selectItem = function selectItem(index) {
    elList.childNodes[index].click();
  };

  this.getList = function getList() {
    return elList;
  };

  this.getData = function getData() {
    return _data;
  };

  this.addLink = function addLink(l10Key, callback, isBefore) {
    var elLink = Evme.$create('li', {
      'class': 'link',
      'data-l10n-id': Evme.Utils.l10nKey(NAME, l10Key)
    });

    elLink.addEventListener('click', callback);

    elLink.addEventListener('mousedown', function onClick(e) {
      e.stopPropagation();
      e.preventDefault();
    });

    if (isBefore) {
      elList.insertBefore(elLink, elList.firstChild);
    } else {
      elList.appendChild(elLink);
    }

    return elLink;
  };

  this.addText = function addText(l10Key) {
    var el = Evme.$create('li', {
      'class': 'text',
      'data-l10n-id': Evme.Utils.l10nKey(NAME, l10Key)
    });

    el.addEventListener('touchstart', function onClick(e) {
      e.stopPropagation();
      e.preventDefault();
    });

    elList.appendChild(el);
  };

  function onScrollStart(e) {
    dontClick = false;
  }

  function onScrollMove(e) {
    if (!dontClick && Math.abs(scroll.distX) > 5) {
      dontClick = true;
    }
  }

  function removeElement(text) {
    if (!text) {
      return false;
    }
    
    text = text.toLowerCase().replace(/\[\]/gi, "");
    
    var removed = false,
        elItems = elList.childNodes;
    
    for (var i=0,el=elItems[i]; el; el=elItems[++i]) {
      var sugg = (el.dataset.suggestion || "").toLowerCase().replace(/\[\]/gi, "");

      if (sugg === text) {
        Evme.$remove(el);
        removed = true;
      }
    }
    
    return removed;
  }

  function getElement(item, index, source) {
      var id = "",
          isSmartObject = (typeof item === "object"),
          text = item;
      
      if (isSmartObject) {
        id = item.id;
        text = item.name;
      }

      if (!text) {
        return false;
      }

      text = text.replace(/</g, "&lt;");

      var content = text.replace(/\[/g, "<b>").replace(/\]/g, "</b>");

      // Pass . so that Brain will know not to search for it
      if (isSmartObject && !item.type && item.type != "") {
          text = ".";
      }

      return '<li data-index="' + index + '" data-suggestion="' + text.replace(/"/g, "&quot;") + '" data-source="' + source + '" data-type="' + id + '">' + content + '</li>';
  }

  function elementClick(e) {
    if (dontClick) {
      return;
    }

    var elClicked = e.originalTarget || e.target;
    while (elClicked && elClicked.nodeName !== 'LI') {
      elClicked = elClicked.parentNode;
    }

    if (!elClicked) {
      clicked = false;
      return;
    }

    if (elClicked.classList.contains('label') || elClicked.classList.contains('text')) {
      return;
    }

    var val = elClicked.dataset.suggestion,
        valToSend = (val || '').replace(/[\[\]]/g, '').toLowerCase();

    if (val) {
      Evme.EventHandler.trigger(NAME, 'click', {
        "el": elClicked,
        "originalValue": val,
        "value": valToSend,
        "source": elClicked.dataset.source,
        "type": elClicked.dataset.type,
        "index": elClicked.dataset.index,
        "visible": isVisibleItem(elClicked.dataset.index)
      });
    }
  }

  function isVisibleItem(index){
    return index <= lastVisibleItem;
  }

  function cbLoaded(inputQuery, parsedQuery, suggestions, spelling, types) {
    Evme.EventHandler.trigger(NAME, "load", {
      "suggestions": suggestions,
      "spelling": spelling,
      "types": types,
      "query": inputQuery
    });
  }
}