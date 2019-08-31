import debounce from "./internal/debounce";

class Queue {
    execute: any;
    queue: string[];
    debounce: any;
    errorHandling: any;

    constructor(execute: (keys: string[]) => Promise<any> , errorHandling: any = (error) => { true }) {
        this.execute = execute;
        this.debounce = debounce(() => this.flush(), (error) => this.endFlush(error));
        this.queue = [];
        this.errorHandling = errorHandling;
    }

    public push(key: string): void {
        this.queue.push(key);
        this.debounce();
    }

    public flush() {
      const flushKeys = Array.from(new Set(this.queue.splice(0)));
      return this.execute(flushKeys);
    }

    public endFlush(error) {
      if(error) {
        if(!this.errorHandling(error)) {
          return;
        }
      }
      if(this.queue.length>0) {
        this.debounce();  
      }
    }
}

export default Queue;