import { Model } from 'components/fxos-mvc/dist/mvc';

const DEBUG = 0;

export default class ListModel extends Model {
  getAppList() {
    return new Promise((resolve, reject) => {
      var localApps = this.loadApps('/apps-v2.json');
      var remoteApps = this.loadApps('http://directory.fxosapps.org/apps-v2.json');
      Promise.all([localApps, remoteApps]).then(
      sources => {
        localApps = sources[0];
        remoteApps = sources[1];

        // Try to fetch the remote app list, but if it fails, use the packaged
        // one instead.
        if (DEBUG || Object.keys(remoteApps).length < 1) {
          resolve(localApps);
        } else {
          resolve(remoteApps);
        }
      });
    });
  }

  loadApps(url) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });
      xhr.open('GET', url, true);
      xhr.responseType = 'json';
      xhr.onload = () => {
        var apps = {};
        if (xhr.status === 200) {
          apps = xhr.response;
          localStorage.setItem('apps', JSON.stringify(apps));
        } else {
          console.log('Error fetching app list', xhr.status);
        }
        resolve(apps);
      };
      xhr.onerror = (e) => {
        console.log('Error fetching app list', e);
        resolve({});
      };
      xhr.send();
    });
  }
}

