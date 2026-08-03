import React from 'react';
import Alert from '@material-ui/lab/Alert';
import { shallowMatchSnapshot } from '../../../common/test_utils';
import { shallow } from 'enzyme';
import Notifications from '../Notifications.component';

jest.mock('../Notifications.messages', () => ({
  refreshPage: {
    id: 'cboard.components.Notifications.refreshPage',
    defaultMessage: 'Refresh page'
  }
}));

const COMPONENT_PROPS = {
  config: {},
  handleNotificationDismissal: () => {},
  message: 'hhh',
  open: true,
  showQueuedNotificationIfAny: () => {}
};

describe('Notifications tests', () => {
  test('default renderer', () => {
    shallowMatchSnapshot(<Notifications {...COMPONENT_PROPS} />);
  });

  test('refresh notification uses service worker update context', () => {
    const onRefreshPage = jest.fn();
    const wrapper = shallow(
      <Notifications
        {...COMPONENT_PROPS}
        kind="refresh"
        onRefreshPage={onRefreshPage}
      />
    );

    const alert = wrapper.find(Alert);
    const button = alert.prop('action');
    button.props.onClick();

    expect(onRefreshPage).toHaveBeenCalledTimes(1);
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});
