function MockRecent(number, type, date) {
  this.type = type;
  this.number = number;
  this.date = date || new Date() - Math.floor(Math.random() * 100);
}
