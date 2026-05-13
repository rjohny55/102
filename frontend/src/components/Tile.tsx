import React, { useCallback } from 'react';
import { Tile as TileData, Position, GameStatus } from '../game/types';
import { TILE_COLORS, TILE_SYMBOLS, SWAP_DURATION } from '../game/constants';

interface TileProps {
  tile: TileData;
  isSelected: boolean;
  gameStatus: GameStatus;
  isNewTile?: boolean;
  isMatched?: boolean;
  onClick: (position: Position) => void;
}

const TileComponent: React.FC<TileProps> = ({
  tile,
  isSelected,
  gameStatus,
  isNewTile,
  isMatched,
  onClick,
}) => {
  const handleClick = useCallback(() => {
    if (gameStatus === GameStatus.idle || gameStatus === GameStatus.selected) {
      onClick(tile.position);
    }
  }, [gameStatus, onClick, tile.position]);

  const isInteractive =
    gameStatus === GameStatus.idle || gameStatus === GameStatus.selected;

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.8rem',
    borderRadius: '8px',
    cursor: isInteractive ? 'pointer' : 'default',
    backgroundColor: TILE_COLORS[tile.type],
    transition: `transform ${SWAP_DURATION}ms ease, opacity 200ms ease`,
    opacity: isMatched ? 0 : 1,
    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
    boxShadow: isSelected
      ? '0 0 0 3px #fff, 0 0 12px rgba(255,255,255,0.6)'
      : '0 2px 4px rgba(0,0,0,0.2)',
    userSelect: 'none',
    position: 'relative',
  };

  const classNames = [
    'tile',
    isSelected && 'tile--selected',
    isMatched && 'tile--matched',
    isNewTile && 'tile--new',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={style}
      onClick={handleClick}
      data-row={tile.position.row}
      data-col={tile.position.col}
      data-type={tile.type}
    >
      <span style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}>
        {TILE_SYMBOLS[tile.type]}
      </span>
    </div>
  );
};

export default React.memo(TileComponent);
