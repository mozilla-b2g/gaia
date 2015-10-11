#!/bin/bash -e

PYTHON_VERSION=2.7.3
USE_PYTHON=`which python`

if [[ ! -z "$VIRTUALENV_EXISTS" ]]; then
  # If virtualenv already exists then we don't have to setup.
  # This is for buildbot where all of the packages we need should
  # already be in the right place since our mozharness script
  # installs them before we get here.
  exit
fi

if [[ -z "$(which virtualenv)" ]]; then
  # If we're not on ci and the user doesn't have virtualenv
  # then we can try to install it but probably ruh roh...
  echo "checking python version"

  function notify_sudo {
    if [ "$SUDO_NOTIFY" = "1" ]; then
      return
    fi
    echo "Sudo access is required to install pip and/or virtualenv "
    echo "on your system.  Please enter your sudo password if prompted. "
    echo "If you don't have sudo access, you will need a system administrator "
    echo "to install python, pip and/or virtualenv for you. This is a requirement for marionette-socket-host."
    SUDO_NOTIFY=1
  }

  function install_python_warning {
    echo "Python $PYTHON_VERSION or greater required!"
    echo "Please install from https://www.python.org/download/releases/2.7.5/"
    exit 1
  }


  USE_PYTHON=`which python`
  if [ -n "$PYTHON_27" ]; then
    USE_PYTHON=$PYTHON_27
  fi
  PYTHON_MAJOR=`$USE_PYTHON -c 'import sys; print(sys.version_info[0])'`
  if [ $? != 0 ]; then
    install_python_warning
  fi
  PYTHON_MINOR=`$USE_PYTHON -c 'import sys; print(sys.version_info[1])'`
  PYTHON_MICRO=`$USE_PYTHON -c 'import sys; print(sys.version_info[2])'`
  VER_SPLIT=(${PYTHON_VERSION//./ })
  printf "Python version found: %s %s %s \n" "$PYTHON_MAJOR" "$PYTHON_MINOR" "$PYTHON_MICRO"
  if [ $PYTHON_MAJOR -ne ${VER_SPLIT[0]} ] || [ $PYTHON_MINOR -ne ${VER_SPLIT[1]} ] || [ $PYTHON_MICRO -lt ${VER_SPLIT[2]} ] ; then
    install_python_warning
  fi

  echo "Setting up virtualenv"

  if ! which pip; then
    if ! which easy_install; then
      echo "Neither pip nor easy_install is found in your path"
      echo "Please install pip directly using: http://pip.readthedocs.org/en/latest/installing"
      exit 1
    fi
    notify_sudo
    sudo easy_install pip || { echo 'error installing pip' ; exit 1; }
  fi

  if ! which virtualenv; then
    notify_sudo
    sudo pip install virtualenv || { echo 'error installing virtualenv' ; exit 1; }
  fi
fi

# Detect pip version. We consider by default that we will have to use
# --trusted-host and we just disable it for release before 7.0.0
PIP_VERSION=`pip --version | cut -d ' ' -f 2 | cut -d '.' -f 1`
TRUSTED_HOST="--trusted-host=pypi.pub.build.mozilla.org"
if [ $PIP_VERSION -lt 7 ]; then
  TRUSTED_HOST=""
fi;

virtualenv --python=$USE_PYTHON --no-site-packages $PWD/venv
source ./venv/bin/activate
cd host/python/runner-service
pip install \
  --find-links=http://pypi.pub.build.mozilla.org/pub $TRUSTED_HOST \
  -r gaia_runner_service.egg-info/requires.txt
python setup.py develop
