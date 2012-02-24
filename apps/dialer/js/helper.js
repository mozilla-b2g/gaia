function profilePictureForNumber(number) {
  var image = '../contacts/contact' + (number % 10) + '.png';
  return '<img src="' + image + '" alt="profile picture" />';
}
