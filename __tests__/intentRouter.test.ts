import { IntentRouter } from '../src/voice/intentRouter';

describe('IntentRouter', () => {
  describe('parseIntent', () => {
    it('should parse pause command', () => {
      const intent = IntentRouter.parseIntent('pause');
      expect(intent.type).toBe('pause');
      expect(intent.confidence).toBeGreaterThan(0.8);
    });

    it('should parse resume command', () => {
      const intent = IntentRouter.parseIntent('play');
      expect(intent.type).toBe('resume');
    });

    it('should parse seek backward', () => {
      const intent = IntentRouter.parseIntent('go back 15 seconds');
      expect(intent.type).toBe('seek_backward');
    });

    it('should parse seek forward', () => {
      const intent = IntentRouter.parseIntent('skip forward 15 seconds');
      expect(intent.type).toBe('seek_forward');
    });

    it('should parse speed change', () => {
      const intent = IntentRouter.parseIntent('set speed to 1.5');
      expect(intent.type).toBe('set_speed');
      expect(intent.parameters?.rate).toBe(1.5);
    });

    it('should parse bookmark command', () => {
      const intent = IntentRouter.parseIntent('bookmark this');
      expect(intent.type).toBe('bookmark');
    });

    it('should parse explain command', () => {
      const intent = IntentRouter.parseIntent('explain quantum computing');
      expect(intent.type).toBe('explain');
      expect(intent.parameters?.topic).toContain('quantum computing');
    });

    it('should parse jump to timestamp', () => {
      const intent = IntentRouter.parseIntent('jump to 12:30');
      expect(intent.type).toBe('jump_to');
      expect(intent.parameters?.timestampMs).toBe(750000); // 12.5 minutes in ms
    });

    it('should return unknown for unrecognized commands', () => {
      const intent = IntentRouter.parseIntent('do something weird');
      expect(intent.type).toBe('unknown');
      expect(intent.confidence).toBe(0);
    });
  });

  describe('command history', () => {
    beforeEach(() => {
      IntentRouter.clearCommandHistory();
    });

    it('should track command history', async () => {
      const intent = IntentRouter.parseIntent('pause');

      // Note: We can't fully test execution without mocking AudioPlayerService
      // This is a smoke test to ensure the function exists
      expect(typeof IntentRouter.executeIntent).toBe('function');
      expect(typeof IntentRouter.getCommandHistory).toBe('function');
    });
  });
});
