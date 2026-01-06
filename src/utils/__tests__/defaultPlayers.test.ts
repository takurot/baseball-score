import { generateDefaultPlayers, DEFAULT_POSITIONS } from '../defaultPlayers';
import { Player } from '../../types';

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid'),
}));

describe('generateDefaultPlayers', () => {
    let mockUuidCounter: number;

    beforeEach(() => {
        mockUuidCounter = 0;
        const { v4: mockedV4 } = require('uuid');
        mockedV4.mockImplementation(() => `mock-uuid-${++mockUuidCounter}`);
    });

    it('should generate exactly 9 players', () => {
        const players = generateDefaultPlayers();
        expect(players).toHaveLength(9);
    });

    it('should generate players with unique IDs', () => {
        const players = generateDefaultPlayers();
        const ids = players.map((p) => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(9);
    });

    it('should generate players with correct positions', () => {
        const players = generateDefaultPlayers();
        const positions = players.map((p) => p.position);
        expect(positions).toEqual(DEFAULT_POSITIONS);
    });

    it('should generate players with Japanese names (選手1〜選手9)', () => {
        const players = generateDefaultPlayers();
        const expectedNames = [
            '選手1',
            '選手2',
            '選手3',
            '選手4',
            '選手5',
            '選手6',
            '選手7',
            '選手8',
            '選手9',
        ];
        const names = players.map((p) => p.name);
        expect(names).toEqual(expectedNames);
    });

    it('should generate players with order from 1 to 9', () => {
        const players = generateDefaultPlayers();
        const orders = players.map((p) => p.order);
        expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should generate players with number matching their order', () => {
        const players = generateDefaultPlayers();
        players.forEach((player, index) => {
            expect(player.number).toBe(`${index + 1}`);
        });
    });

    it('should generate all players as active', () => {
        const players = generateDefaultPlayers();
        players.forEach((player) => {
            expect(player.isActive).toBe(true);
        });
    });

    it('should conform to Player type', () => {
        const players = generateDefaultPlayers();
        players.forEach((player) => {
            expect(player).toHaveProperty('id');
            expect(player).toHaveProperty('name');
            expect(player).toHaveProperty('number');
            expect(player).toHaveProperty('position');
            expect(player).toHaveProperty('isActive');
            expect(player).toHaveProperty('order');
        });
    });
});

describe('DEFAULT_POSITIONS', () => {
    it('should contain 9 standard baseball positions', () => {
        expect(DEFAULT_POSITIONS).toHaveLength(9);
    });

    it('should include all standard baseball positions', () => {
        const expectedPositions = ['CF', '2B', 'SS', '3B', 'RF', '1B', 'LF', 'C', 'P'];
        expect(DEFAULT_POSITIONS).toEqual(expectedPositions);
    });
});
