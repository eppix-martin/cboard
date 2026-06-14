import React from 'react';
import { shallow } from 'enzyme';

import Board, { getBoardGridCols, isFamilyBoard } from '../Board.component';
jest.mock('../Board.messages', () => ({
  editTitle: {
    id: 'cboard.components.Board.editTitle',
    defaultMessage: 'Edit Board Title'
  },
  boardTitle: {
    id: 'cboard.components.Board.boardTitle',
    defaultMessage: 'Board Title'
  },
  boardEditTitleCancel: {
    id: 'cboard.components.Board.boardEditTitleCancel',
    defaultMessage: 'Cancel'
  },
  boardEditTitleAccept: {
    id: 'cboard.components.Board.boardEditTitleAccept',
    defaultMessage: 'Accept'
  }
}));

const intlMock = {
  formatMessage: ({ id }) => id
};

it('renders without crashing', () => {
  const props = {
    intl: intlMock,
    onAddRemoveColumn: () => {},
    onAddRemoveRow: () => {},
    board: {
      id: 'root',
      name: 'home',
      author: 'Cboard',
      email: 'support@cboard.io',
      isPublic: true,
      hidden: false,
      tiles: [
        {
          labelKey: 'cboard.symbol.yes',
          image: '/symbols/mulberry/correct.svg',
          id: 'HJVQMR9pX5F-',
          backgroundColor: 'rgb(255, 241, 118)',
          label: 'yes'
        },
        {
          labelKey: 'symbol.descriptiveState.no',
          image: '/symbols/mulberry/no.svg',
          id: 'SkBQMRqpX5t-',
          backgroundColor: 'rgb(255, 241, 118)',
          label: 'no'
        }
      ]
    }
  };
  shallow(<Board {...props} />);
});

describe('family board layout', () => {
  it('identifies boards with the family prefix only', () => {
    expect(isFamilyBoard({ id: 'family-root' })).toBe(true);
    expect(isFamilyBoard({ id: 'root' })).toBe(false);
  });

  it('uses four columns for non-fixed family boards on tablet and desktop sizes', () => {
    const displaySettings = { uiSize: 'Standard' };
    const cols = getBoardGridCols({ id: 'family-personas' }, displaySettings);

    expect(cols).toEqual({
      lg: 4,
      md: 4,
      sm: 4,
      xs: 4,
      xxs: 2
    });
  });

  it('keeps the default grid columns for non-family boards', () => {
    const displaySettings = { uiSize: 'Standard' };
    const cols = getBoardGridCols({ id: 'root' }, displaySettings);

    expect(cols).toEqual({
      lg: 6,
      md: 6,
      sm: 5,
      xs: 4,
      xxs: 3
    });
  });
});
