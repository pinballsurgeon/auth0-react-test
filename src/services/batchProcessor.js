// src/services/batchProcessor.js
// objective: fetch images for domain members in batches, processing items added individually.

const IMAGE_SERVER_URL = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-image-server-1';
const BATCH_SIZE = 10; // define the desired batch size

export class BatchProcessor {
  constructor(onBatchProcessed, onLog) {
    this.currentBatch = []; // stores items waiting to reach batch size
    // this.batchBuffer = ''; // removed - no longer needed
    this.onBatchProcessed = onBatchProcessed; // callback when a batch finishes processing
    this.onLog = onLog || console.log; // logging function (can be console or engineLog)
    this.batchCount = 0; // counter for processed batches
    this.processingBatches = new Set(); // track promises of batches currently processing
  }

  // internal logging helper
  logWithTimestamp(message, type = 'info') {
    // use the provided onLog function which might add engine context
    this.onLog(message, type);
  }

  // fetches a single image
  async fetchImage(item) {
    try {
      this.logWithTimestamp(`Fetching image for: "${item}"`, 'debug');
      const response = await fetch(`${IMAGE_SERVER_URL}?prompt=${encodeURIComponent(item)}`);
      if (!response.ok) {
         const errorText = await response.text().catch(() => `Status: ${response.status}`);
         throw new Error(`HTTP error! ${errorText}`);
      }
      const data = await response.json();
      // check if thumbnail exists in response
      if (!data || !data.thumbnail) {
          this.logWithTimestamp(`No thumbnail found in response for "${item}"`, 'warn', data);
          return null;
      }
      return data.thumbnail;
    } catch (error) {
      this.logWithTimestamp(`Failed to fetch image for "${item}": ${error.message}`, 'error');
      return null; // return null on error
    }
  }

  // processes a complete batch of items
  async processBatch(items) {
    if (!items || items.length === 0) {
        this.logWithTimestamp('Skipping empty batch processing.', 'warn');
        return null;
    }

    const batchStartTime = performance.now();
    this.batchCount++;
    const batchNumber = this.batchCount;

    this.logWithTimestamp(
      `Processing image batch #${batchNumber} with ${items.length} items: [${items.slice(0,3).join(', ')}${items.length > 3 ? '...' : ''}]`,
      'info'
    );

    // create a promise representing this batch's processing
    const batchPromise = (async () => {
        try {
            // fetch all images in parallel for this batch
            const imagePromises = items.map(async (item) => {
                const startTime = performance.now();
                const imageUrl = await this.fetchImage(item);
                const duration = (performance.now() - startTime).toFixed(2);
                return {
                  text: item,
                  imageUrl,
                  fetchTime: duration
                };
            });

            const processedItems = await Promise.all(imagePromises);
            const processingTime = (performance.now() - batchStartTime).toFixed(2);

            const batchResult = {
                batchNumber,
                items: processedItems,
                processingTime,
                timestamp: new Date().toISOString()
            };

            this.logWithTimestamp(
                `Completed image batch #${batchNumber} in ${processingTime}ms`,
                'success'
            );

            // call the callback AFTER processing is complete
            if (typeof this.onBatchProcessed === 'function') {
                this.onBatchProcessed(batchResult);
            }
            return batchResult; // return result for potential chaining if needed

        } catch (error) {
            this.logWithTimestamp(
                `Error processing image batch #${batchNumber}: ${error.message}`,
                'error'
            );
            // Decide: should an error here stop everything? Or just log?
            // Let's log and continue, returning null to indicate batch failure.
            return null; // indicate failure
        } finally {
            // remove this promise from the tracking set once done (success or fail)
            this.processingBatches.delete(batchPromise);
            this.logWithTimestamp(`Batch #${batchNumber} processing finished tracking. Active: ${this.processingBatches.size}`, 'debug');
        }
    })();

    // add the promise to the tracking set
    this.processingBatches.add(batchPromise);
    this.logWithTimestamp(`Batch #${batchNumber} processing started tracking. Active: ${this.processingBatches.size}`, 'debug');

    // note: we don't await batchPromise here in processItem or constructor context
    // finalize will await all pending promises
    return batchPromise; // return the promise
  }

  // NEW METHOD: adds a single item and triggers batch processing if size met
  processItem(item) {
    if (item && typeof item === 'string' && item.trim().length > 0) {
      const trimmedItem = item.trim();
      this.logWithTimestamp(`Adding item to batch queue: "${trimmedItem}"`, 'debug');
      this.currentBatch.push(trimmedItem);

      // check if batch size is reached
      if (this.currentBatch.length >= BATCH_SIZE) {
        this.logWithTimestamp(`Batch size ${BATCH_SIZE} reached. Triggering processing.`, 'info');
        const batchToProcess = [...this.currentBatch]; // copy current batch items
        this.currentBatch = []; // clear current batch immediately
        this.processBatch(batchToProcess); // start processing (async, fire-and-forget here)
      }
    } else {
       this.logWithTimestamp(`Skipped adding invalid item: ${item}`, 'warn');
    }
  }

  // REMOVED METHOD: no longer needed
  // processStreamChunk(chunk) { ... }

  // UPDATED METHOD: processes the remaining items in currentBatch
  async finalize() {
    this.logWithTimestamp('Finalizing BatchProcessor...', 'info');
    // process any remaining items in the current batch
    if (this.currentBatch.length > 0) {
      this.logWithTimestamp(`Processing final partial batch of ${this.currentBatch.length} items.`, 'info');
      const finalBatch = [...this.currentBatch];
      this.currentBatch = []; // clear
      this.processBatch(finalBatch); // start processing this last batch
    } else {
        this.logWithTimestamp('No remaining items in current batch to process.', 'info');
    }

    // wait for all batches that are currently processing to complete
    this.logWithTimestamp(`Waiting for ${this.processingBatches.size} active batch(es) to complete...`, 'info');
    await Promise.allSettled([...this.processingBatches]); // wait for all tracked promises

    this.logWithTimestamp('BatchProcessor finalize complete. All active batches settled.', 'success');
  }
}