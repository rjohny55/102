import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TileComponent from '../Tile';
import { Tile as TileData, TileType, GameStatus } from '../../game/types';

describe('TileComponent', () => {
  const baseTile: TileData = {
    id: 'test-tile-1',
    type: TileType.RED,
    position: { row: 0, col: 0 },
  };

  it('renders without crashing', () => {
    const onClick = vi.fn();
    const { container } = render(
      <TileComponent
        tile={baseTile}
        isSelected={false}
        gameStatus={GameStatus.idle}
        onClick={onClick}
      />,
    );
    expect(container).toBeTruthy();
  });

  it('calls onClick when clicked during idle state', () => {
    const onClick = vi.fn();
    render(
      <TileComponent
        tile={baseTile}
        isSelected={false}
        gameStatus={GameStatus.idle}
        onClick={onClick}
      />,
    );
    const tileElement = screen.getByText('🔴');
    fireEvent.click(tileElement);
    expect(onClick).toHaveBeenCalledWith({ row: 0, col: 0 });
  });

  it('does not call onClick when game is in swapping state', () => {
    const onClick = vi.fn();
    render(
      <TileComponent
        tile={baseTile}
        isSelected={false}
        gameStatus={GameStatus.swapping}
        onClick={onClick}
      />,
    );
    const tileElement = screen.getByText('🔴');
    fireEvent.click(tileElement);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when game is in matching state', () => {
    const onClick = vi.fn();
    render(
      <TileComponent
        tile={baseTile}
        isSelected={false}
        gameStatus={GameStatus.matching}
        onClick={onClick}
      />,
    );
    const tileElement = screen.getByText('🔴');
    fireEvent.click(tileElement);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders with selected styles when isSelected is true', () => {
    const onClick = vi.fn();
    const { container } = render(
      <TileComponent
        tile={baseTile}
        isSelected={true}
        gameStatus={GameStatus.selected}
        onClick={onClick}
      />,
    );
    const tileDiv = container.querySelector('.tile--selected');
    expect(tileDiv).not.toBeNull();
  });

  it('renders with matched class when isMatched is true', () => {
    const onClick = vi.fn();
    const { container } = render(
      <TileComponent
        tile={baseTile}
        isSelected={false}
        isMatched={true}
        gameStatus={GameStatus.matching}
        onClick={onClick}
      />,
    );
    const tileDiv = container.querySelector('.tile--matched');
    expect(tileDiv).not.toBeNull();
  });

  it('renders with new tile class when isNewTile is true', () => {
    const onClick = vi.fn();
    const { container } = render(
      <TileComponent
        tile={baseTile}
        isSelected={false}
        isNewTile={true}
        gameStatus={GameStatus.idle}
        onClick={onClick}
      />,
    );
    const tileDiv = container.querySelector('.tile--new');
    expect(tileDiv).not.toBeNull();
  });

  it('displays correct emoji for each tile type', () => {
    const onClick = vi.fn();
    const types: Array<{ type: TileType; emoji: string }> = [
      { type: TileType.RED, emoji: '🔴' },
      { type: TileType.BLUE, emoji: '🔵' },
      { type: TileType.GREEN, emoji: '🟢' },
      { type: TileType.YELLOW, emoji: '🟡' },
      { type: TileType.PURPLE, emoji: '🟣' },
      { type: TileType.ORANGE, emoji: '🟠' },
    ];

    types.forEach(({ type, emoji }) => {
      const tile: TileData = {
        id: `tile-${type}`,
        type,
        position: { row: 0, col: 0 },
      };
      const { unmount } = render(
        <TileComponent
          tile={tile}
          isSelected={false}
          gameStatus={GameStatus.idle}
          onClick={onClick}
        />,
      );
      expect(screen.getByText(emoji)).toBeTruthy();
      unmount();
    });
  });
});
