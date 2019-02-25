
import { Container } from './container';
import { EventAggregator, Event } from './events';

/**
 * An event aggregator that is automatically attached to tasks that are created with a container.
 * Pipeline instances can be obtained from a container.
 */
export class Pipeline extends EventAggregator {
    constructor(container: Container) {
        super();
    }

    /**
     * Activate all attached tasks.
     */
    async activate(): Promise<void> {
        const event = new PipelineActivateEvent();
        this.publish(event);
        await Promise.all(event.pending);
    }

    /**
     * Deactivate all attached tasks.
     */
    async deactivate(): Promise<void> {
        const event = new PipelineDeactivateEvent();
        this.publish(event);
        await Promise.all(event.pending);
    }
}

/**
 * An event that is published by the pipeline to activate all attached tasks.
 */
export class PipelineActivateEvent implements Event {
    public readonly channel = PipelineActivateEvent;
    public readonly pending: Array<Promise<void>> = [];
}

/**
 * An event that is published by the pipeline to deactivate all attached tasks.
 */
export class PipelineDeactivateEvent implements Event {
    public readonly channel = PipelineDeactivateEvent;
    public readonly pending: Array<Promise<void>> = [];
}
