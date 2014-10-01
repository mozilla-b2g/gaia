import uuid

PASSWORD = '123456789'

class FxAUser(object):
    """Handler for Firefox Accounts test user data:  usernames (emails) and passwords"""

    def __init__(self):
        self._email_prefix = "kilroy"
        self._email_host = "restmail.net"

    def get_random_string(self, str_len=24):
        return str(uuid.uuid4().get_hex().lower()[0:str_len])

    def _get_email(self, suffix):
        return self._email_prefix + "_" + suffix +"@" + self._email_host

    def email_new(self):
        """return new email with a randomized string """
        str_random = self.get_random_string(16)
        return self._get_email(str_random)

    def email_existing(self):
        return self._get_email("exists")

    def password(self):
        return PASSWORD


if "__name__" == "__main__":

    fxa_user = FxAUser()
    print fxa_user.email_new()
