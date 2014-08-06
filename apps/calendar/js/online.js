Calendar.isOnline = function() {
  if (!navigator || ! 'onLine' in navigator) {
    return false;
  }

  return navigator.onLine;
};
