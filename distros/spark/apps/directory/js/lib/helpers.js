import AchievementsService from
  'components/fxos-achievements-service/dist/achievements-service';

export class IconHelper {
  static setImage(imageElement, imagePath) {
    imageElement.src = imagePath || window.DEFAULT_ICON_URL;
    imageElement.onerror = (e) => {
      console.warn('Warning, failed to load icon url', imageElement.src, e);
      imageElement.src = window.DEFAULT_ICON_URL;
    };
  }
}

export class AppsHelper {
  static getAllApps() {
    return new Promise((resolve, reject) => {
      var mgmt = navigator.mozApps.mgmt;
      if (!mgmt) {
        reject(new Error('Cannot fetch apps, no permissions'));
      }

      var req = mgmt.getAll();
      req.onsuccess = () => {
        resolve(req.result);
      };
      req.onerror = e => {
        reject(e);
      };
    });
  }
}

export class ManifestHelper {
  static getManifest(url) {
    return new Promise((resolve, reject) => {
      var req = new XMLHttpRequest();
      req.open('GET', url, true);
      req.responseType = 'json';
      req.onload = () => {
        resolve(req.response);
      };
      req.onerror = e => {
        reject(e);
      };
      req.send();
    });
  }

  static hasHigherPriviledges(manifest1, manifest2) {
    return manifest1.type === manifest2.type ||
      manifest1.type === 'certified' ||
      (manifest1.type === 'privileged' && manifest2.type !== 'certified');
  }
}

export class ActivityHelper {
  constructor() {
    this.ready = new Promise((resolve, reject) => {
      if (navigator.mozHasPendingMessage &&
          navigator.mozHasPendingMessage('activity')) {
        navigator.mozSetMessageHandler('activity', activity => {
          let activitySource = activity.source;

          if (activitySource.name !== 'install') {
            activity.postError('Unsupported activity');
            return;
          }

          this.isActivity = true;
          window.addEventListener('request-activity-finish', () => {
            activity.postResult('finished');
          });
          resolve(this.getRoute(activitySource.data.type));
        });
      } else {
        let hash = window.location.hash;
        resolve(this.getRoute(hash && hash.slice(1)));
      }
    });
  }

  getRoute(type) {
    return type || 'apps';
  }
}

export class AchievementsHelper {
  constructor() {
    // Create an achievements service
    this.achievementsService = new AchievementsService();

    window.addEventListener('achievement-rewarded', this);
  }

  handleEvent(aEvent) {
    this.achievementsService.reward(aEvent.detail);
  }
}
