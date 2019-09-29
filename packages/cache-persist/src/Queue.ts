/*import debounce from './internal/debounce';

class Queue {
    private execute: any;
    private queue: Array<string>;
    private debounce: any;
    private errorHandling: any;
    private complete = () => console.log("complete", Date.now());
    private start = () => console.log("start", Date.now());
    private resolvePush;
    private rejectPush;
    private promisePush: Promise<void>;
    private inExecution = false;
    private timerId: any;
    private optionsDebounce;

    constructor(options: { throttle?: number; execute: (keys: Array<string>) => Promise<any>; errorHandling: (error: any) => boolean }) {
        const { execute, throttle, errorHandling = (_error): boolean => true } = options;
        this.execute = options.execute;
        this.debounce = debounce(() => this.flush(), (error) => this.endFlush(error), { throttle });
        this.queue = [];
        this.errorHandling = errorHandling;
    }

    public push(key: string, promise: true): Promise<void>;
    public push(key: string): void;
    public push(key: any, promise?: any) {
        if (!this.promisePush && promise) {
            console.log("this.promisePush", this.promisePush)
            this.promisePush = new Promise((resolve, reject) => {
                this.rejectPush = reject;
                this.resolvePush = resolve;
            })
        }

        if (this.queue.length === 0) {
            this.start();
        }
        this.queue.push(key);
        this.debounce();
        if (promise) {
            return this.promisePush;
        }
    }

    private clear() {
        this.cancelTimer();
        this.inExecution = false;
    }

    private cancelTimer() {
        if (!this.timerId) return;
        clearTimeout(this.timerId);
        this.timerId = null;
    }

    private setNextTimer(throttle = 500) {
        this.cancelTimer();
        this.timerId = setTimeout(timerExpired, throttle);
    }

    public flush(): Promise<any> {
        const flushKeys = Array.from(new Set(this.queue.splice(0)));
        return this.execute(flushKeys);
    }

    public endFlush(error, errorHandling = (_error): boolean => true): void {
        this.promisePush = null;
        if (error) {
            if(this.rejectPush)
            this.rejectPush(error);
            if (!this.errorHandling(error)) {
                return;
            }
        }
        if(this.resolvePush)
        this.resolvePush();

        if (this.queue.length > 0) {
            this.debounce();
            return;
        }
        this.complete();
    }
}

export default Queue;
*/

function Queue(options: { throttle?: number; execute: (keys: Array<string>) => Promise<any>; errorHandling: (error: any) => boolean }) {
    let timerId = null;
    let inExecution = false;
    let resolvePush;
    let rejectPush;
    let promisePush: Promise<void>;
    /*const complete = () => console.log("complete", Date.now());
    const next = () => console.log("next", Date.now());
    const start = () => console.log("start", Date.now());*/
    const queue: Array<string> = [];
    const { execute, throttle = 500, errorHandling = (_error): boolean => true } = options;
    function invokeFunc(): void {
        inExecution = true;
        //next();
        const flushKeys = Array.from(new Set(queue.splice(0)));
        // this allows to resolve only the promises registered before the execution
        const resolve = resolvePush;
        const reject = rejectPush;
        resolvePush = null;
        rejectPush = null;
        promisePush = null;
        const dispose = function(error?: Error) {
            if (error) {
                if (reject) {
                    reject();
                }
                errorHandling(error);
            } else {
                if (resolve) {
                    resolve();
                }
            }
            cancelTimer();

            inExecution = false;
            if (queue.length > 0) {
                debounced();
            }
        };
        execute(flushKeys)
            .then(() => dispose())
            .catch((error) => dispose(error));
    }

    function timerExpired(): void {
        if (!inExecution) {
            invokeFunc();
        }
        setNextTimer(); // maybe it is not needed, evalute check on queue
    }

    function cancelTimer() {
        if (!timerId) return;
        clearTimeout(timerId);
        timerId = null;
    }

    function setNextTimer() {
        cancelTimer();
        timerId = setTimeout(timerExpired, throttle);
    }

    function debounced() {
        if (!timerId) {
            setNextTimer();
        }
    }

    function push(key: string, promise: true): Promise<void>;
    function push(key: string): void;
    function push(key: any, promise?: any) {
        if (!promisePush && promise) {
            promisePush = new Promise((resolve, reject) => {
                rejectPush = reject;
                resolvePush = resolve;
            });
        }

        /*if (!execution && queue.length === 0) {
            start();
        }*/
        queue.push(key);
        debounced();
        if (promise) {
            return promisePush;
        }
    }

    return {
        push,
    };
}

export default Queue;
