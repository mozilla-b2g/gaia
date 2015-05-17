#!/bin/bash -e

if [ ! -z "$VIRTUALENV_EXISTS" ]; then
  # If virtualenv already exists then we don't have to setup.
  exit
fi

# TODO: isntall virtual env if they dont have it
# TODO: install the right version of python of they don't have it
# TODO: figure out what the right version of python is
echo "checking python version"

PYTHON_VERSION=2.7.3

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
    echo "Please install pip directly using: http://pip.readthedocs.org/en/latest/installing.html#install-or-upgrade-pip"
    exit 1
  fi
  notify_sudo
  sudo easy_install pip || { echo 'error installing pip' ; exit 1; }
fi

if ! which virtualenv; then
  notify_sudo
  sudo pip install virtualenv || { echo 'error installing virtualenv' ; exit 1; }
fi

virtualenv --python=$USE_PYTHON --no-site-packages $PWD/venv
source ./venv/bin/activate
cd host/python/runner-service
python setup.py develop
