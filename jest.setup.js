// Mock game store
const mockGameStore = {
  games: new Map(),
  playerToGame: new Map(),
  getGameIdByPlayer: jest.fn(),
  getGame: jest.fn(),
};

// Mock Socket.IO
const mockIo = {
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
};

// Mock socket
const mockSocket = {
  id: 'test-socket-id',
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  on: jest.fn(),
};

// Make mocks available globally
global.gameStore = mockGameStore;
global.io = mockIo;
global.socket = mockSocket;

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
