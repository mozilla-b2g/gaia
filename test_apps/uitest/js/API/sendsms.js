var sendSMS = document.querySelector('#send-sms');
if (sendSMS) {
  sendSMS.onclick = function() {
    var sms = new MozActivity({
      name: 'new', // Possible compose-sms in future versions
      data: {
        type: 'websms/sms',
        number: '+46777888999'
      }
    });
  };
}
