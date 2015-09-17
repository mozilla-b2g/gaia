import ListView from 'js/view/list_view';

export default class AppListView extends ListView {
  constructor() {
    super();
    this.el.id = 'app-list';
  }

  update(list) {
    var appList = {};
    for (let manifestURL in list) {
      if (list[manifestURL].type !== 'addon') {
        appList[manifestURL] = list[manifestURL];
      }
    }
    super(appList);
  }
}
