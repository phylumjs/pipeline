
import { EventAggregator, Event } from './events'

/**
 * An event aggregator that controls attached tasks.
 */
export class Pipeline extends EventAggregator {
	/**
	 * Start all tasks that are attached to this pipeline.
	 * @returns {Promise<void>} A promise that resolves when all tasks are fully started.
	 */
	public async start() {
		const event = new StartTasksEvent()
		this.publish(event)
		await Promise.all(event.starting)
	}

	/**
	 * Stop all tasks that are attached to this pipeline.
	 */
	public stop() {
		this.publish(new StopTasksEvent())
	}

	public async done() {
		const event = new TasksDoneEvent()
		this.publish(event)
		await Promise.all(event.activity)
		// TODO: Repeat this, while any task has pending activity.
	}
}

/**
 * An event that is emitted to start tasks.
 */
export class StartTasksEvent implements Event {
	public readonly channel = StartTasksEvent
	public readonly starting: Set<Promise<void>> = new Set()
}

/**
 * An event that is emitted to stop tasks.
 */
export class StopTasksEvent implements Event {
	public readonly channel = StopTasksEvent
}

export class TasksDoneEvent implements Event {
	public readonly channel = TasksDoneEvent
	public readonly activity: Set<Promise<void>> = new Set()
}
