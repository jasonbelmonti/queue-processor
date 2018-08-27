class QueueProcessor {
  constructor(queue, name, args) {
    this.queue = queue;
    this.name = name;
    this.requests = [];
    this.counts = {
      success: 0,
      error: 0
    };

    this.args = args;
  }

  process(func, onSuccess, onError, onComplete) {
    const queue = this.queue;
    const self = this;

    if(queue.length > 0) {
      // splice operates on the array instance, mutating the passed `queue` array. the removed items
      // are returned
      const item = queue.splice(queue.length -1)[0];

      if(!item) {
        return;
      }

      const request = func(item);

      this.requests.push(request);

      request.then((result) => {
        result = JSON.parse(result);

        // this line couples the processor to the textrazor schema.  error should be caught at a
        // different layer so the queue processor can remain generic
        if(result.hasOwnProperty('error') || result.ok === false) {
          onError(result, item);
        } else {
          self.counts.success += 1;
          onSuccess(result, item, this.args);
        }
        this.process(func, onSuccess, onError, onComplete);
      }).catch((error) => {
        onError(error);
        this.counts.error += 1;
        this.process(func, onSuccess, onError, onComplete);
      });
    } else {

      Promise.all(this.requests)
      .then(() => {
        onComplete(this);
      })
      .catch((error) => {
        onError(error);
      })
    }
  }
}

module.exports = QueueProcessor;