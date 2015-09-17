import ListView from 'js/view/list_view';

export default class AddonListView extends ListView {
  constructor() {
    super();
    this.el.id = 'addon-list';
  }

  update(list) {
    var addonList = {};
    for (let manifestURL in list) {
      if (list[manifestURL].type === 'addon') {
        addonList[manifestURL] = list[manifestURL];
      }
    }
    super(addonList);
  }
}
