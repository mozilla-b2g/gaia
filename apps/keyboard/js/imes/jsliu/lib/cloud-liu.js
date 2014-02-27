function CloudLiu(worker) {
  this.worker = worker;
  this.candidates = [];
  this.keyStrokes = [];

  var raw = atob(db_data.value);
  var array = new Int8Array(raw.length);
  for (var i = 0; i < raw.length; ++i) {
    array[i] = raw.charCodeAt(i);
  }
  this.db = SQL.open(array);
}

CloudLiu.prototype.doQuery = function() {
  if (this.keyStrokes.length == 0) {
    this.candidates = [];
    return;
  }

  var key_map = { 44: "55", 46: "56", 91: "45", 93: "46", 39: "27" };
  var query_str = "SELECT phrase FROM phrases WHERE ";

  for (var i in this.keyStrokes) {
    var ch = this.keyStrokes[i];
    var alpha = key_map[ch]? key_map[ch]: ch - 97 + 1;
    query_str += ["m", i, "=", alpha, " AND "].join("");
  }

  query_str = query_str.replace(/ AND $/, "");
  query_str += " ORDER BY mlen,-freq LIMIT 10;";

  this.candidates = this.db.exec(query_str).map(function(v) {
    return v[0].value; });
  console.log(query_str);
  console.log(this.candidates);
  this.updateCandidates();
}

CloudLiu.prototype.handle_Key = function(key) {
  switch (key) {
  case 8:
    return this.handle_Backspace();
  case 13:
    return this.handle_Enter();
  case 27:
    return this.handle_Escape();
  case 32:
    return this.handle_Space();
  default:
    if ((key >= 97 && key <= 122)
        || [44, 46, 91, 93, 39].indexOf(key) != -1) {
      console.log("handle_Key:", key);
      this.handle_Default(key);
      return true;
    }
  }
  return false;
}

CloudLiu.prototype.handle_Backspace = function () {
  if (this.keyStrokes.length) {
    this.keyStrokes.pop();
    this.doQuery();
    this.updatePreEdit();
    this.updateCandidates();
    return true;
  }
  return false;
}

CloudLiu.prototype.handle_Default = function (key) {
  if (this.keyStrokes.length < 5) {
    this.keyStrokes.push(key);
    this.doQuery();
    this.updatePreEdit();
  }
}

CloudLiu.prototype.handle_Space = function () {
  if (this.candidates.length) {
    this.worker.postMessage({
      cmd: 'endComposition',
      value: this.candidates[0]
    });
    this.keyStrokes = [];
    this.candidates = [];
    this.updatePreEdit();
    this.updateCandidates();
    return true;
  } else {
    return false;
  }
}

CloudLiu.prototype.handle_Enter = function() {
  return this.handle_Space();
}


CloudLiu.prototype.handle_Escape = function() {
  if (this.keyStrokes.length) {
    this.keyStrokes = [];
    this.candidates = [];
    this.updatePreEdit();
    this.updateCandidates();
    return true;
  }
  return false;
}

CloudLiu.prototype.updatePreEdit = function() {
  this.worker.postMessage({
    cmd: 'setComposition',
    value: this.keyStrokes.map(function(v) {
      return String.fromCharCode(v)
    }).join("")
  });
}

CloudLiu.prototype.updateCandidates = function() {
  this.worker.postMessage({
    cmd: 'sendCandidates',
    value: this.candidates
  });
}
