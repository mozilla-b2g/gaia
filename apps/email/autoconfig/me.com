<clientConfig version="1.1">
  <emailProvider id="icloud.com">
    <domain>me.com</domain>
    <domain>icloud.com</domain>
    <displayName>iCloud Mail</displayName>
    <displayShortName>iCloud</displayShortName>
    <incomingServer type="imap">
      <hostname>imap.mail.me.com</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>smtp.mail.me.com</hostname>
      <port>587</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </outgoingServer>
    <documentation url="http://support.apple.com/kb/HT4864">
      <descr>Mail server information</descr>
    </documentation>
  </emailProvider>
</clientConfig>
