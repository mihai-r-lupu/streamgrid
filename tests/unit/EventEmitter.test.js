import { expect } from 'chai';
import { EventEmitter } from '../../src/events/EventEmitter.js';

describe('EventEmitter', () => {
    it('should call subscribed listeners', () => {
        const emitter = new EventEmitter();
        let eventTriggered = false;

        emitter.on('testEvent', () => {
            eventTriggered = true;
        });

        emitter.emit('testEvent');

        expect(eventTriggered).to.be.true;
    });

    it('should unsubscribe listeners', () => {
        const emitter = new EventEmitter();
        let eventTriggered = false;

        const callback = () => {
            eventTriggered = true;
        };

        emitter.on('testEvent', callback);
        emitter.off('testEvent', callback);

        emitter.emit('testEvent');

        expect(eventTriggered).to.be.false;
    });

    it('should handle emitting unknown events gracefully', () => {
        const emitter = new EventEmitter();
        emitter.emit('nonexistentEvent'); // Should not throw
    });
});
