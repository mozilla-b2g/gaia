<clientConfig version="1.1">
  <emailProvider id="qq.com">
    <domain>qq.com</domain>
    <displayName>qq.com</displayName>
    <displayShortName>qq.com</displayShortName>
    <incomingServer type="imap">
      <hostname>imap.qq.com</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>smtp.qq.com</hostname>
      <port>465</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </outgoingServer>
  </emailProvider>
</clientConfig>
