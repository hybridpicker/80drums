import '@testing-library/jest-dom';

// ── Web Audio API Mocks ──

class MockAudioParam {
  constructor(defaultValue = 0) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
  }
  setValueAtTime(value, time) { this.value = value; return this; }
  linearRampToValueAtTime(value, time) { this.value = value; return this; }
  exponentialRampToValueAtTime(value, time) { this.value = value; return this; }
  setTargetAtTime(target, startTime, timeConstant) { this.value = target; return this; }
}

class MockAudioNode {
  connect(dest) { return dest; }
  disconnect() {}
}

class MockGainNode extends MockAudioNode {
  constructor() {
    super();
    this.gain = new MockAudioParam(1);
  }
}

class MockOscillatorNode extends MockAudioNode {
  constructor() {
    super();
    this.type = 'sine';
    this.frequency = new MockAudioParam(440);
  }
  start() {}
  stop() {}
}

class MockBiquadFilterNode extends MockAudioNode {
  constructor() {
    super();
    this.type = 'lowpass';
    this.frequency = new MockAudioParam(350);
    this.Q = new MockAudioParam(1);
    this.gain = new MockAudioParam(0);
  }
}

class MockDynamicsCompressorNode extends MockAudioNode {
  constructor() {
    super();
    this.threshold = new MockAudioParam(-24);
    this.knee = new MockAudioParam(30);
    this.ratio = new MockAudioParam(12);
    this.attack = new MockAudioParam(0.003);
    this.release = new MockAudioParam(0.25);
  }
}

class MockBufferSourceNode extends MockAudioNode {
  constructor() {
    super();
    this.buffer = null;
    this.loop = false;
  }
  start() {}
  stop() {}
}

class MockConvolverNode extends MockAudioNode {
  constructor() {
    super();
    this.buffer = null;
    this.normalize = true;
  }
}

class MockAudioBuffer {
  constructor({ length = 1, numberOfChannels = 1, sampleRate = 44100 } = {}) {
    this.length = length;
    this.numberOfChannels = numberOfChannels;
    this.sampleRate = sampleRate;
    this._channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      this._channels.push(new Float32Array(length));
    }
  }
  getChannelData(channel) {
    return this._channels[channel];
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.destination = new MockAudioNode();
  }
  createGain() { return new MockGainNode(); }
  createOscillator() { return new MockOscillatorNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createDynamicsCompressor() { return new MockDynamicsCompressorNode(); }
  createBufferSource() { return new MockBufferSourceNode(); }
  createConvolver() { return new MockConvolverNode(); }
  createBuffer(numChannels, length, sampleRate) {
    return new MockAudioBuffer({ numberOfChannels: numChannels, length, sampleRate });
  }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
}

class MockOfflineAudioContext extends MockAudioContext {
  constructor(channels, length, sampleRate) {
    super();
    this.channels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
  }
  async startRendering() {
    return new MockAudioBuffer({
      numberOfChannels: this.channels,
      length: this.length,
      sampleRate: this.sampleRate,
    });
  }
}

// Install globally
globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;
globalThis.OfflineAudioContext = MockOfflineAudioContext;
globalThis.AudioBuffer = MockAudioBuffer;

// requestAnimationFrame / cancelAnimationFrame mock for tests
// Does NOT execute callback to prevent infinite loops in test env
let rafId = 0;
globalThis.requestAnimationFrame = () => ++rafId;
globalThis.cancelAnimationFrame = () => {};

// localStorage mock (happy-dom provides one, but ensure it's clean)
beforeEach(() => {
  localStorage.clear();
});
