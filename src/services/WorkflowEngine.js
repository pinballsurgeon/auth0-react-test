// src/services/WorkflowEngine.js

import { PCA } from 'ml-pca';
import { generateDomainItemsStream, MODELS } from './llmProvider';
import { BatchProcessor } from './batchProcessor';
import { fetchGlobalAttributes, fetchRatedAttributesForItem } from './attributeService';
import { LogService } from './logService';

/**
 * Runs the complete workflow for a given domain.
 *
 * @param {Object} params
 * @param {string} params.domain - The domain input (e.g., "cars").
 * @param {string} [params.selectedModel=MODELS.GPT35] - The selected LLM model.
 * @param {Function} [params.logCallback] - Optional callback to receive log entries.
 * @returns {Promise<Object>} The final data structure including domain members, global attributes,
 * rated attributes (with iterative PCA), logs, and batch info.
 */
export const runWorkflow = async ({
  domain,
  selectedModel = MODELS.GPT35,
  logCallback = () => {}
}) => {
  // Initialize state variables.
  let logs = [];
  let domainMembers = [];
  let globalAttributes = null;
  let ratedAttributes = [];
  let pcaIterationCount = 0;
  let nextPcaThreshold = 5;
  const batches = [];

  // Track processed and pending members.
  const processedMembers = new Set();
  const pendingRatingMembers = [];

  // Utility: Append a timestamped log entry.
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const logEntry = { message: `[${timestamp}] ${message}`, type };
    logs.push(logEntry);
    logCallback(logEntry);
  };

  // Batch processing callback.
  const handleBatchProcessed = (batchResult) => {
    batches.push(batchResult);
  };

  // Instantiate the BatchProcessor.
  const batchProcessor = new BatchProcessor(handleBatchProcessed, addLog);

  // Helper: Process an individual member (if not already processed) using global attributes.
  const processMemberRating = async (member, globalAttr) => {
    if (processedMembers.has(member)) return;
    processedMembers.add(member);
    try {
      const result = await fetchRatedAttributesForItem(member, globalAttr);
      // Simulate retrieving an image URL.
      const imageUrl = `https://example.com/images/${member.replace(/\s/g, '_')}.jpg`;
      ratedAttributes.push({
        member,
        attributes: { ...result, imageUrl },
        success: true,
      });
    } catch (err) {
      ratedAttributes.push({
        member,
        error: err.message,
        success: false,
      });
    }
  };

  // Helper: Process an array of new members.
  const processNewMembers = async (members, globalAttr) => {
    await Promise.all(members.map((member) => processMemberRating(member, globalAttr)));
  };

  // Function to dynamically perform PCA on the valid rated attributes.
  const updatePCA = () => {
    const validRatings = ratedAttributes.filter(item => item.success && item.attributes);
    if (validRatings.length === 0) return;

    // Extract the first valid rating object's nested rating values.
    const firstAttributes = validRatings[0].attributes;
    let firstRatingObj = null;
    for (const key in firstAttributes) {
      if (key !== "imageUrl") {
        firstRatingObj = firstAttributes[key];
        break;
      }
    }
    if (!firstRatingObj) {
      addLog('No valid numerical rating object found for PCA', 'error');
      return;
    }

    // Determine the rating keys from the nested object.
    const ratingKeys = Object.keys(firstRatingObj).filter(key => {
      const value = firstRatingObj[key];
      return typeof value === 'number' && value >= 0 && value <= 10;
    });
    if (ratingKeys.length === 0) {
      addLog('No valid numerical attributes found for PCA', 'error');
      return;
    }

    // Build the data matrix from each valid entry.
    const dataMatrix = validRatings.map(item => {
      let ratingObj = null;
      for (const key in item.attributes) {
        if (key !== "imageUrl") {
          ratingObj = item.attributes[key];
          break;
        }
      }
      return ratingKeys.map(key => Number(ratingObj[key]));
    });

    // Perform PCA to reduce to 3 components.
    const pca = new PCA(dataMatrix);
    const projected = pca.predict(dataMatrix, { nComponents: 3 }).to2DArray();

    // Construct a dynamic field key, e.g., "batch0_pca", "batch1_pca", etc.
    const fieldKey = `batch${pcaIterationCount}_pca`;

    // Update each valid rated attribute object with the new PCA result.
    ratedAttributes = ratedAttributes.map((item, index) => {
      if (item.success && item.attributes) {
        return { ...item, [fieldKey]: projected[index] };
      }
      return item;
    });
    addLog(`Performed PCA iteration ${pcaIterationCount} on ${validRatings.length} members`);

    // Update iteration count and threshold.
    pcaIterationCount += 1;
    nextPcaThreshold += 5;
  };

  // Constant for when to fetch global attributes.
  const FIRST_BATCH_THRESHOLD = 2;

  // Local variables for stream processing.
  let partialBuffer = '';
  let globalAttributesFetched = false;
  let globalAttrLocal = null;

  addLog(`Starting domain list generation for: "${domain}"`);

  try {
    // Begin streaming domain members.
    await generateDomainItemsStream(domain, selectedModel, async (chunk) => {
      partialBuffer += chunk;
      // Split on commas (assuming CSV output).
      const parts = partialBuffer.split(',');
      const completeMembers = parts.slice(0, -1).map(s => s.trim()).filter(Boolean);
      partialBuffer = parts[parts.length - 1];
      domainMembers.push(...completeMembers);
      completeMembers.forEach(member => {
        if (!processedMembers.has(member)) {
          pendingRatingMembers.push(member);
        }
      });

      // Fetch global attributes once enough members are pending.
      if (!globalAttributesFetched && pendingRatingMembers.length >= FIRST_BATCH_THRESHOLD) {
        globalAttributesFetched = true;
        const firstBatch = [...pendingRatingMembers];
        addLog(`First batch reached: ${firstBatch.join(', ')}`);
        try {
          globalAttrLocal = await fetchGlobalAttributes(domain, firstBatch);
          globalAttributes = globalAttrLocal;
          addLog('Global attributes fetched successfully', 'success');
          for (const member of pendingRatingMembers) {
            await processMemberRating(member, globalAttrLocal);
          }
          pendingRatingMembers.length = 0;
        } catch (err) {
          addLog(`Error fetching global attributes: ${err.message}`, 'error');
        }
      } else if (globalAttributesFetched && globalAttrLocal) {
        await processNewMembers(completeMembers, globalAttrLocal);
      }

      // Process the chunk for batch display.
      batchProcessor.processStreamChunk(chunk);

      // Trigger PCA update if threshold is met.
      const validCount = ratedAttributes.filter(item => item.success && item.attributes).length;
      if (validCount >= nextPcaThreshold) {
        updatePCA();
      }
    });

    // Process any remaining data.
    if (partialBuffer.trim()) {
      const lastMember = partialBuffer.trim();
      domainMembers.push(lastMember);
      if (!processedMembers.has(lastMember)) {
        if (globalAttributesFetched && globalAttrLocal) {
          await processMemberRating(lastMember, globalAttrLocal);
        } else {
          pendingRatingMembers.push(lastMember);
        }
      }
    }
    await batchProcessor.finalize();

    // Final PCA run (if any valid entries exist).
    if (ratedAttributes.filter(item => item.success && item.attributes).length > 0) {
      updatePCA();
    }

    // Return the complete data structure.
    return {
      domain,
      domainMembers,
      globalAttributes,
      ratedAttributes, // Each object now includes PCA results (e.g., batch0_pca, batch1_pca, etc.)
      logs,
      batches,
    };
  } catch (err) {
    addLog(`Error: ${err.message}`, 'error');
    throw err;
  }
};
