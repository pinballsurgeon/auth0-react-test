// src/services/batchProcessor.js

const IMAGE_SERVER_URL = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-image-server-1';

export class BatchProcessor {
  constructor(onBatchProcessed, onLog) {
    this.currentBatch = [];
    this.batchBuffer = '';
    this.onBatchProcessed = onBatchProcessed;
    this.onLog = onLog || console.log;
    this.batchCount = 0;
  }

  logWithTimestamp(message, type = 'info') {
    this.onLog(message, type);
  }

  async fetchImage(item) {
    try {
      const response = await fetch(`${IMAGE_SERVER_URL}?prompt=${encodeURIComponent(item)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.thumbnail;
    } catch (error) {
      this.logWithTimestamp(`Failed to fetch image for ${item}: ${error.message}`, 'error');
      return null;
    }
  }

  async processBatch(items) {
    const batchStartTime = performance.now();
    this.batchCount++;
    const batchNumber = this.batchCount;
    
    this.logWithTimestamp(
      `Processing batch #${batchNumber} with ${items.length} items`, 
      'info'
    );

    try {
      // Fetch all images in parallel
      const imagePromises = items.map(async (item) => {
        const startTime = performance.now();
        const imageUrl = await this.fetchImage(item);
        const duration = (performance.now() - startTime).toFixed(2);
        
        this.logWithTimestamp(
          `Fetched image for "${item}" in ${duration}ms`,
          'debug'
        );

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
        `Completed batch #${batchNumber} in ${processingTime}ms`, 
        'success'
      );

      this.onBatchProcessed(batchResult);
      return batchResult;
    } catch (error) {
      this.logWithTimestamp(
        `Error processing batch #${batchNumber}: ${error.message}`, 
        'error'
      );
      throw error;
    }
  }

  processStreamChunk(chunk) {
    this.batchBuffer += chunk;
    const items = this.batchBuffer.split(',').map(item => item.trim()).filter(Boolean);
    
    // Process in batches of 5 items
    while (items.length >= 5) {
      const batchItems = items.splice(0, 5);
      this.processBatch(batchItems);
    }
    
    // Save remaining items for next chunk
    this.batchBuffer = items.join(', ');
  }

  // Process final batch if any items remain
  async finalize() {
    if (this.batchBuffer) {
      const finalItems = this.batchBuffer
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
        
      if (finalItems.length > 0) {
        await this.processBatch(finalItems);
      }
    }
    this.batchBuffer = '';
  }
}