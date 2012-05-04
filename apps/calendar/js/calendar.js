/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var Calendar = (function () {
  // Iterate over all entries if x is an array, otherwise just call fn on x.
  function ForAll(x, fn) {
    if (!(x instanceof Array)) {
      fn(x);
      return;
    }
    for (var n = 0; n < x.length; ++n)
      fn(x[n]);
  }

  /* Pattern for an individual entry: name:value */
  var ENTRY = /^([A-Za-z0-9-]+)((?:;[A-Za-z0-9-]+=(?:"[^"]+"|[^";:,]+)(?:,(?:"[^"]+"|[^";:,]+))*)*):(.*)$/;
  /* Pattern for an individual parameter: name=value[,value] */
  var PARAM = /;([A-Za-z0-9-]+)=((?:"[^"]+"|[^";:,]+)(?:,(?:"[^"]+"|[^";:,]+))*)/g;
  /* Pattern for an individual parameter value: value | "value" */
  var PARAM_VALUE = /,?("[^"]+"|[^";:,]+)/g;

  // Load url from the network.
  function Load(url, success, error) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onreadystatechange = function(e) {
      if (request.readyState == 4) {
        if (request.status == 200 || request.status == 0)
          return success(request.responseText);
        return error(request.statusText);
      }
    }
    request.send(null);
  }

  // Parse a calendar in iCal format.
  var ParseICal = function(text, success, error) {
    // Parse the text into an object graph
    var lines = text.replace('\r', '').split('\n');
    var tos = Object.create(null);
    var stack = [tos];

    // Parse parameters for an entry. Foramt: <param>=<pvalue>[;...]
    function parseParams(params) {
      var map = Object.create(null);
      var param = PARAM.exec(params);
      while (param) {
        var values = [];
        var value = PARAM_VALUE.exec(param[2]);
        while (value) {
          values.push(value[1].replace(/^"(.*)"$/, '$1'));
          value = PARAM_VALUE.exec(param[2]);
        }
        map[param[1].toLowerCase()] = (values.length > 1 ? values : values[0]);
        param = PARAM.exec(params);
      }
      return map;
    }

    // Add a property to the current object. If a property with the same name
    // already exists, turn it into an array.
    function add(prop, value, params) {
      if (params)
        value = { parameters: parseParams(params), value: value };
      if (prop in tos) {
        var previous = tos[prop];
        if (previous instanceof Array) {
          previous.push(value);
          return;
        }
        value = [previous, value];
      }
      tos[prop] = value;
    }

    for (var n = 0; n < lines.length; ++n) {
      var line = lines[n];
      // check whether the line continues (next line stats with space or tab)
      var nextLine;
      while ((nextLine = lines[n+1]) && (nextLine[0] == ' ' || nextLine[0] == '\t')) {
        line += nextLine.substr(1);
        ++n;
        continue;
      }
      // parse the entry, format is 'PROPERTY:VALUE'
      var matches = ENTRY.exec(line);
      if (!matches)
        return error('invalid format');
      var prop = matches[1].toLowerCase();
      var params = matches[2];
      var value = matches[3];
      switch (prop) {
      case 'begin':
        var obj = Object.create(null);
        add(value.toLowerCase(), obj);
        stack.push(tos = obj);
        break;
      case 'end':
        stack.pop();
        tos = stack[stack.length - 1];
        if (stack.length == 1) {
          var cal = stack[0];
          if (typeof cal.vcalendar != 'object' || cal.vcalendar instanceof Array)
            return error('single vcalendar object expected');
          return success(cal.vcalendar);
        }
        break;
      default:
        add(prop, value, params);
        break;
      }
    }
    return error('unexpected end of file');
  }

  function Value(v) {
    return (typeof v !== 'object') ? v : v.value;
  }

  function Parameter(v, name) {
    if (typeof v !== 'object')
      return undefined;
    return v.parameters[name];
  }

  // Parse a time specification.
  function ParseDateTime(v) {
    var dt = Value(v);
    if (Parameter(v, 'VALUE') == 'DATE') {
      // 20081202
      return new Date(dt.substr(0, 4), dt.substr(4, 2), dt.substr(6, 2));
    }
    v = Value(v);
    // 20120426T130000Z
    var year = dt.substr(0, 4);
    var month = dt.substr(4, 2) - 1;
    var day = dt.substr(6, 2);
    var hour = dt.substr(9, 2);
    var min = dt.substr(11, 2);
    var sec = dt.substr(13, 2);
    if (dt[15] == 'Z')
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    return new Date(year, month, day, hour, min, sec);
  }

  function constructor(url) {
    this.url = url;
  }

  constructor.prototype = {
    load: function(success, error) {
      Load(this.url, function (data) {
        ParseICal(data, success, error);
      }, error);
    },
    forAll: ForAll
  };

  return constructor;
})();

var WeekDay = (function () {
  var names = [];
  for (var n = 0; n < 7; ++n)
    names[n] = new Date(Date.UTC(2012, 0, 1 + n)).toString().split(' ')[0];
  return names;
})();

function Today() {
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function IsSameDay(date1, date2) {
  return date1.getDate() == date2.getDate() &&
         date1.getMonth() == date2.getMonth() &&
         date1.getFullYear() == date2.getFullYear();
}

function IsSameMonth(date1, date2) {
  return date1.getMonth() == date2.getMonth() &&
         date1.getFullYear() == date2.getFullYear();
}

function IsBefore(date1, date2) {
  return date1.getTime() < date2.getTime();
}

function MonthView(container) {
  var table = document.createElement('table');
  table.className = 'monthview';
  container.appendChild(table);
  var id = 0;
  for (var week = -1; week < 5; ++week) {
    var row = document.createElement('tr');
    table.appendChild(row);
    for (var weekday = 0; weekday < 7; ++weekday) {
      var cell = document.createElement((week == -1) ? 'th' : 'td');
      if (week == -1) {
        cell.textContent = WeekDay[weekday].toUpperCase();
      } else {
        cell.id = id;
        ++id;
        var label = document.createElement('div');
        label.className = 'label';
        cell.appendChild(label);
        var space = document.createElement('div');
        space.className = 'space';
        cell.appendChild(space);
        var busy = document.createElement('div');
        busy.className = 'busy';
        var style = busy.style;
        style.left = "30%";
        style.right = "10%";
        cell.appendChild(busy);
      }
      row.appendChild(cell);
    }
  }
}

MonthView.prototype = {
  show: function(date, cal) {
    var today = Today();
    var year = date.getFullYear();
    var month = date.getMonth();
    var first = new Date(year, month, 1); // the first of this month
    var skipdays = first.getDay();
    var day0 = new Date(year, month, 1 - skipdays); // first day in grid
    year = day0.getFullYear();
    month = day0.getMonth();
    var day = day0.getDate();

    // Setup the basic calendar view, mark past and current days, and
    // highlight today.
    var children = document.querySelectorAll('table.monthview > tr > td');
    var map = [];
    for (var n = 0; n < children.length; ++n) {
      var cell = children[n];
      var id = (cell.id | 0);
      var dt = new Date(year, month, day + id);
      cell.children[0].textContent = dt.getDate();
      cell.className = '';
      if (dt.getMonth() == date.getMonth())
        cell.classList.add('current');
      if (IsSameDay(dt, today))
        cell.classList.add('today');
      if (IsBefore(dt, today))
        cell.classList.add('past');
      map[day + id] = cell;
    }
  }
};

function main() {
  var today = new Today();
  var cal = new Calendar('test-data/james.ics');
  var monthview = new MonthView(document.body);
  monthview.show(today);
  cal.load(function(data) {
    console.log(data);
  }, function() {
  });
}
