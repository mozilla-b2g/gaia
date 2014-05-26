# using a venv avoids the need for any root weirdness and makes it somewhat easy
# to replicate this setup locally. Original script taken from the gaia-ui-tests
# install.

DIR_TEST_ENV=$PWD/travis_venv
VERSION_VIRTUALENV=1.11
URL_VIRTUALENV=https://pypi.python.org/packages/source/v/virtualenv/virtualenv-${VERSION_VIRTUALENV}.tar.gz

setup_venv() {
  echo "creating virtual environment"
  if type virtualenv >/dev/null 2>&1; then
    virtualenv $DIR_TEST_ENV
  else
    echo "downloading virtualenv from ${URL_VIRTUALENV}"
    curl -O ${URL_VIRTUALENV}
    tar xvfz virtualenv-${VERSION_VIRTUALENV}.tar.gz
    python virtualenv-${VERSION_VIRTUALENV}/virtualenv.py ${DIR_TEST_ENV}
  fi

  source $DIR_TEST_ENV/bin/activate
}

if [ "$VIRTUAL_ENV" != "$DIR_TEST_ENV" ]
then
  # don't rerun virutal env if already in the right venv
  setup_venv
fi

