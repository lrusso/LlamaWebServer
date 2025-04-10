import { EventEmitter } from "events"

export class TaskQueue extends EventEmitter {
  constructor(concurrency = 1) {
    super()
    this.queue = []
    this.concurrency = concurrency
    this.running = 0
  }

  async processTask() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      this.running++
      const task = this.queue.shift()
      try {
        await task()
      } catch (error) {
        this.emit("error", error)
      } finally {
        this.running--
        this.processTask() // PROCESS NEXT TASK IF AVAILABLE
      }
    }
  }

  enqueue(task) {
    this.queue.push(task)
    this.processTask()
  }

  size() {
    return this.queue.length + this.running
  }

  getQueue() {
    return [...this.queue]
  }

  isRunning() {
    return this.running > 0 || this.queue.length > 0
  }
}
