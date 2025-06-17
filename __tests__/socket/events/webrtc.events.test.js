const setupWebRTCEvents = require('../../../socket/events/webrtc.events');

describe('WebRTC Events', () => {
  let io;
  let socket;
  let gameStore;

  beforeEach(() => {
    // Mock Socket.IO objects
    socket = {
      id: 'test-socket-id',
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      on: jest.fn()
    };

    io = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis()
    };

    // Mock game store
    gameStore = {
      getGameIdByPlayer: jest.fn(),
      getGame: jest.fn(),
    };
  });

  it('should handle WebRTC offer signaling', () => {
    setupWebRTCEvents(io, socket, gameStore);

    // Get the offer handler
    const offerHandler = socket.on.mock.calls.find(
      call => call[0] === 'webrtc:offer'
    )?.[1];

    expect(offerHandler).toBeDefined();

    // Test offer handling
    const testOffer = {
      to: 'target-peer-id',
      offer: { type: 'offer', sdp: 'test-sdp' }
    };

    offerHandler(testOffer);

    expect(socket.to).toHaveBeenCalledWith('target-peer-id');
    expect(socket.to().emit).toHaveBeenCalledWith('webrtc:offer', {
      from: 'test-socket-id',
      offer: testOffer.offer
    });
  });

  it('should handle WebRTC answer signaling', () => {
    setupWebRTCEvents(io, socket, gameStore);

    // Get the answer handler
    const answerHandler = socket.on.mock.calls.find(
      call => call[0] === 'webrtc:answer'
    )?.[1];

    expect(answerHandler).toBeDefined();

    // Test answer handling
    const testAnswer = {
      to: 'target-peer-id',
      answer: { type: 'answer', sdp: 'test-sdp' }
    };

    answerHandler(testAnswer);

    expect(socket.to).toHaveBeenCalledWith('target-peer-id');
    expect(socket.to().emit).toHaveBeenCalledWith('webrtc:answer', {
      from: 'test-socket-id',
      answer: testAnswer.answer
    });
  });

  it('should handle WebRTC ICE candidates', () => {
    setupWebRTCEvents(io, socket, gameStore);

    // Get the ICE candidate handler
    const iceHandler = socket.on.mock.calls.find(
      call => call[0] === 'webrtc:ice-candidate'
    )?.[1];

    expect(iceHandler).toBeDefined();

    // Test ICE candidate handling
    const testCandidate = {
      to: 'target-peer-id',
      candidate: {
        candidate: 'test-candidate',
        sdpMLineIndex: 0,
        sdpMid: '0'
      }
    };

    iceHandler(testCandidate);

    expect(socket.to).toHaveBeenCalledWith('target-peer-id');
    expect(socket.to().emit).toHaveBeenCalledWith('webrtc:ice-candidate', {
      from: 'test-socket-id',
      candidate: testCandidate.candidate
    });
  });

  it('should handle WebRTC data messages and update game state', () => {
    const mockGame = {
      handleLetterSelection: jest.fn(),
      handleNameVote: jest.fn()
    };

    gameStore.getGameIdByPlayer.mockReturnValue('test-game-id');
    gameStore.getGame.mockReturnValue(mockGame);

    setupWebRTCEvents(io, socket, gameStore);

    // Get the data message handler
    const dataHandler = socket.on.mock.calls.find(
      call => call[0] === 'webrtc:data'
    )?.[1];

    expect(dataHandler).toBeDefined();

    // Test letter selection
    const letterMessage = {
      to: 'target-peer-id',
      data: {
        type: 'letter-selection',
        data: 'A',
        senderId: 'test-socket-id',
        timestamp: Date.now()
      }
    };

    dataHandler(letterMessage);

    expect(gameStore.getGameIdByPlayer).toHaveBeenCalledWith('test-socket-id');
    expect(gameStore.getGame).toHaveBeenCalledWith('test-game-id');
    expect(mockGame.handleLetterSelection).toHaveBeenCalledWith('test-socket-id', 'A');
    expect(socket.to).toHaveBeenCalledWith('test-game-id');
    expect(socket.to().emit).toHaveBeenCalledWith('game:letter_selected', {
      playerId: 'test-socket-id',
      letter: 'A'
    });

    // Test name vote
    const voteMessage = {
      to: 'target-peer-id',
      data: {
        type: 'name-vote',
        data: {
          word: 'testword',
          vote: 'yes'
        },
        senderId: 'test-socket-id',
        timestamp: Date.now()
      }
    };

    dataHandler(voteMessage);

    expect(mockGame.handleNameVote).toHaveBeenCalledWith('test-socket-id', 'testword', 'yes');
    expect(socket.to).toHaveBeenCalledWith('test-game-id');
    expect(socket.to().emit).toHaveBeenCalledWith('game:vote_submitted', {
      playerId: 'test-socket-id',
      word: 'testword',
      vote: 'yes'
    });
  });

  it('should handle WebRTC connection state changes', () => {
    const mockGame = {
      handlePeerDisconnection: jest.fn()
    };

    gameStore.getGameIdByPlayer.mockReturnValue('test-game-id');
    gameStore.getGame.mockReturnValue(mockGame);

    setupWebRTCEvents(io, socket, gameStore);

    // Get the connection state handler
    const stateHandler = socket.on.mock.calls.find(
      call => call[0] === 'webrtc:connection_state'
    )?.[1];

    expect(stateHandler).toBeDefined();

    // Test connection failure
    stateHandler({
      state: 'failed',
      peerId: 'peer-id'
    });

    expect(gameStore.getGameIdByPlayer).toHaveBeenCalledWith('test-socket-id');
    expect(gameStore.getGame).toHaveBeenCalledWith('test-game-id');
    expect(mockGame.handlePeerDisconnection).toHaveBeenCalledWith('test-socket-id', 'peer-id');
  });
});
