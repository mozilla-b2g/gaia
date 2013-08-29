#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import smtplib

from email.mime.text import MIMEText


class EmailUtil:

    def send(self, senders_account, mock_email):
        """
        Usage:
        senders_account = dict
        Sender's account details: email, password, smtp_hostname, smtp_port

        mock_email = gaitest.mocks.mock_email.MockObject
        Mock email object.
        """

        self.senders_account = senders_account

        # connect to SMTP server
        self.server = smtplib.SMTP_SSL(self.senders_account['smtp_hostname'],
                                       str(self.senders_account['smtp_port']))
        self.server.set_debuglevel(False)

        self.server.login(self.senders_account['email'],
                          self.senders_account['password'])

        msg = MIMEText(mock_email.message)
        msg['Subject'] = mock_email.subject
        msg['To'] = mock_email.recipients_email
        msg['from'] = self.senders_account['email']

        self.server.sendmail(self.senders_account['email'],
                             mock_email.recipients_email,
                             msg.as_string())

        self.server.quit()
