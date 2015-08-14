import BaseClass from 'models/base-class';
import mediator from 'utils/mediator';

class BaseWidget extends BaseClass {
    constructor() {
        super();
        setTimeout(() => {
            mediator.emit('widget:load', this);
        }, 20);
    }
}

export default BaseWidget;
