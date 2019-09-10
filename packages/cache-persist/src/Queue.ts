import debounce from './internal/debounce';

class Queue {
    private execute: any;
    private queue: Array<string>;
    private debounce: any;
    private errorHandling: any;

    constructor(options: { throttle?: number; execute: (keys: Array<string>) => Promise<any>; errorHandling: (error: any) => boolean }) {
        const { execute, throttle, errorHandling = (_error): boolean => true } = options;
        this.execute = execute;
        this.debounce = debounce(() => this.flush(), (error) => this.endFlush(error), { throttle });
        this.queue = [];
        this.errorHandling = errorHandling;
    }

    public push(key: string): void {
        this.queue.push(key);
        this.debounce();
    }

    public flush(): Promise<any> {
        const flushKeys = Array.from(new Set(this.queue.splice(0)));
        return this.execute(flushKeys);
    }

    public endFlush(error): void {
        if (error) {
            if (!this.errorHandling(error)) {
                return;
            }
        }
        if (this.queue.length > 0) {
            this.debounce();
        }
    }
}

export default Queue;
