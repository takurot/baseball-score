import { Player } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Default positions for a baseball team in batting order style
 * 1: CF (Center Field) - 2: 2B (Second Base) - 3: SS (Shortstop)
 * 4: 3B (Third Base) - 5: RF (Right Field) - 6: 1B (First Base)
 * 7: LF (Left Field) - 8: C (Catcher) - 9: P (Pitcher)
 */
export const DEFAULT_POSITIONS = [
    'CF',
    '2B',
    'SS',
    '3B',
    'RF',
    '1B',
    'LF',
    'C',
    'P',
];

/**
 * Generate 9 default players for a new team
 * Each player has a Japanese name (選手1〜選手9), a number (1-9),
 * a position from DEFAULT_POSITIONS, and is set as active.
 */
export function generateDefaultPlayers(): Player[] {
    return DEFAULT_POSITIONS.map((position, index) => ({
        id: uuidv4(),
        name: `選手${index + 1}`, // Player 1, Player 2, etc. in Japanese
        number: `${index + 1}`,
        position,
        isActive: true,
        order: index + 1,
    }));
}
