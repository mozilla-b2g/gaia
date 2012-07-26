"""Usage: python %prog [ADB_PATH]

ADB_PATH is the path to the |adb| executable we should run.

Used by |make install-gaia| to push files to a device.  You shouldn't run
this file directly.

"""

import sys
import os
import hashlib
import subprocess
from tempfile import mkstemp

def compute_local_hash(filename, hashes):
    h = hashlib.sha1()
    with open(filename,'rb') as f:
        for chunk in iter(lambda: f.read(256 * h.block_size), b''):
             h.update(chunk)
    hashes[filename] = h.hexdigest()

def compute_local_hashes_in_dir(dir, hashes):
    def visit(arg, dirname, names):
        for filename in [os.path.join(dirname, name) for name in names]:
            if not os.path.isfile(filename):
                continue
            compute_local_hash(filename, hashes)

    os.path.walk(dir, visit, None)

def compute_local_hashes():
    hashes = {}
    compute_local_hashes_in_dir('webapps', hashes)
    compute_local_hash('user.js', hashes)
    compute_local_hash('profile/permissions.sqlite', hashes)
    return hashes

def adb_push(local, remote):
    global adb_cmd
    subprocess.check_call([adb_cmd, 'push', local, remote])

def adb_shell(cmd, ignore_error=False):
    global adb_cmd

    # Output the return code so we can check whether the command executed
    # successfully.
    new_cmd = cmd + '; echo "RETURN CODE: $?"'

    # universal_newlines=True because adb shell returns CRLF separators.
    proc = subprocess.Popen([adb_cmd, 'shell', new_cmd],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            universal_newlines=True)
    (stdout, stderr) = proc.communicate()
    if stderr.strip():
        raise Exception('adb shell "%s" returned the following unexpected error: "%s"' %
                        (cmd, stderr.strip()))
    if proc.returncode != 0:
        raise Exception('adb shell "%s" exited with error %d' % (cmd, proc.returncode))

    split = [line for line in stdout.split('\n') if line.strip()]
    if not ignore_error and not split[-1].startswith('RETURN CODE: 0'):
        raise Exception('adb shell "%s" did not complete successfully. Output:\n%s' % (cmd, stdout))

    # Don't return the "RETURN CODE: 0" line!
    return split[0:-1]


def compute_remote_hashes():
    hashes = {}
    adb_out = adb_shell('cd /data/local && find . -type f | xargs sha1sum')
    for (hash, filename) in [line.split() for line in adb_out]:
        # Strip off './' from the filename.
        if filename.startswith('./'):
            filename = filename[2:]
        else:
            raise Exception('Unexpected filename %s' % filename)

        hashes[filename] = hash
    return hashes

INDEXED_DB_FOLDER = 'indexedDB/'

def remove_from_remote(local_hashes, remote_hashes):
    """Remove any files from the remote device which don't appear in
    local_hashes.

    """

    # Keep indexedDB content
    to_keep = set()
    for path in remote_hashes:
        if path[:len(INDEXED_DB_FOLDER)] == INDEXED_DB_FOLDER:
            to_keep.add(path)

    to_remove = list(set(remote_hashes.keys()) - set(local_hashes.keys()) - to_keep)

    if not to_remove:
        return

    print 'Removing from device:\n%s\n' % '\n'.join(to_remove)
    # Chunk to_remove into 25 files at a time so we don't send too much over
    # adb_shell at once.
    for files in [to_remove[pos:pos + 25] for pos in xrange(0, len(to_remove), 25)]:
        adb_shell('cd /data/local && rm -f %s' % ' '.join(files))

def push_to_remote(local_hashes, remote_hashes):
    global adb_cmd

    to_push = set()
    for (k, v) in local_hashes.items():
        if k not in remote_hashes or remote_hashes[k] != local_hashes[k]:
            to_push.add(k)

    if not to_push:
        return

    print 'Pushing to device:\n%s' % '\n'.join(list(to_push))

    tmpfile, tmpfilename = mkstemp()
    try:
        subprocess.check_call(['tar', '-czf', tmpfilename] + list(to_push))
        adb_push(tmpfilename, '/data/local')
        basename = os.path.basename(tmpfilename)
        adb_shell('cd /data/local && tar -xzf %s && rm %s' % (basename, basename))
    finally:
        os.remove(tmpfilename)

def install_gaia_fast():
    os.chdir('profile')
    try:
        local_hashes = compute_local_hashes()
        remote_hashes = compute_remote_hashes()
        remove_from_remote(local_hashes, remote_hashes)
        push_to_remote(local_hashes, remote_hashes)
    finally:
        os.chdir('..')

def install_gaia_slow():
    global adb_cmd
    adb_shell("rm -r /data/local/webapps", ignore_error=True)
    adb_shell("rm /data/local/user.js", ignore_error=True)
    adb_push('profile/webapps', '/data/local/webapps')
    adb_push('profile/user.js', '/data/local')
    adb_push('profile/permissions.sqlite', '/data/local')

def install_gaia():
    try:
        install_gaia_fast()
    except:
        # If anything goes wrong, fall back to the slow method.
        install_gaia_slow()

if __name__ == '__main__':
    if len(sys.argv) > 2:
        print 'Too many arguments!  Usage: python %s [ADB_PATH]' % __FILE__
        sys.exit(1)

    if len(sys.argv) == 2:
        adb_cmd = sys.argv[1]
    else:
        adb_cmd = 'adb'

    install_gaia()
