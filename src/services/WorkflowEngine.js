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
 * @returns {Promise<Object>} The final data structure including domainMembers, globalAttributes,
 * ratedAttributes (with iterative PCA fields), logs, and batch info.
 */
export const runWorkflow = async ({
  domain,
  selectedModel = MODELS.GPT35,
  logCallback = () => {},
}) => {
  // ----------------------------
  // 1. Initialize local "state"
  // ----------------------------
  let logs = [];
  let domainMembers = [];
  let globalAttributes = null;
  let ratedAttributes = [];
  let pcaIterationCount = 0;
  let nextPcaThreshold = 5;
  const batches = [];

  // Tracking for processed members and those pending rating
  const processedMembers = new Set();
  const pendingRatingMembers = [];

  // Utility to push logs with a timestamp
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const logEntry = { message: `[${timestamp}] ${message}`, type };
    logs.push(logEntry);
    logCallback(logEntry);
  };

  // ----------------------------
  // 2. Batch Processor Callback
  // ----------------------------
  // We'll store the images from the batch in a map so we can link them back to rated attributes
  const imageMap = new Map(); // key: item text, value: imageUrl

  const handleBatchProcessed = (batchResult) => {
    batches.push(batchResult);
    // For each item, store its imageUrl in the imageMap
    batchResult.items.forEach((itm) => {
      // itm.text is the original domain member name (assuming the chunk is the member string)
      // itm.imageUrl is the fetched image URL from the batchProcessor
      if (itm.text && itm.imageUrl) {
        imageMap.set(itm.text, itm.imageUrl);
      }
    });
  };

  const batchProcessor = new BatchProcessor(handleBatchProcessed, addLog);

  // ----------------------------
  // 3. Helper Functions
  // ----------------------------

  /**
   * processMemberRating: fetches rated attributes for a single member
   * and incorporates an imageUrl (retrieved via batchProcessor results).
   */
  const processMemberRating = async (member, globalAttr) => {
    if (processedMembers.has(member)) return; // avoid double-processing
    processedMembers.add(member);

    try {
      const result = await fetchRatedAttributesForItem(member, globalAttr);
      // We assume `result` might look like:
      // { "967 Ford Mustang GT": { "acceleration-0-60": 8, "top-speed": 9, ... } }
      // or possibly just { "acceleration-0-60": 8, "top-speed": 9, ... }
      // If your function returns a different shape, adapt accordingly.

      // Determine the final rated attributes structure. For PCA logic, we preserve a nested object:
      // e.g., { [member]: { ...ratings } }
      let finalRatedObj = {};
      if (result && typeof result === 'object') {
        // If the top-level object has the member key, we just reuse it
        if (result.hasOwnProperty(member)) {
          finalRatedObj = { [member]: result[member] };
        } else {
          // Otherwise, nest the entire object under the member key
          finalRatedObj = { [member]: result };
        }
      }

      // Get the image URL from the batchProcessor’s imageMap (if available)
      const imageUrl = imageMap.get(member) || null;

      ratedAttributes.push({
        member,
        attributes: {
          ...finalRatedObj,
          imageUrl,
        },
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

  /**
   * processNewMembers: fetch rating data for an array of new members.
   * This is called once global attributes are available.
   */
  const processNewMembers = async (members, globalAttr) => {
    await Promise.all(members.map((m) => processMemberRating(m, globalAttr)));
  };

  /**
   * updatePCA: Recomputes PCA on all valid rated entries
   * every time a threshold is reached (e.g., every 5 members).
   */
  const updatePCA = () => {
    const validRatings = ratedAttributes.filter(
      (item) => item.success && item.attributes
    );
    if (validRatings.length === 0) return;

    // Each item in validRatings has attributes like:
    // {
    //   [member]: { acceleration-0-60: 8, top-speed: 9, ... },
    //   imageUrl: "..."
    // }
    // We need to find the "member" portion (not imageUrl).
    // We'll assume there's exactly one non-"imageUrl" key in the attribute object.

    // Example:
    // item.attributes = {
    //   "967 Ford Mustang GT": { acceleration-0-60: 8, top-speed: 9, ... },
    //   imageUrl: "..."
    // }

    // 1. Identify the numeric rating keys
    let firstRatingObj = null;
    const firstValid = validRatings[0]?.attributes || {};
    for (const k in firstValid) {
      if (k !== 'imageUrl' && typeof firstValid[k] === 'object') {
        firstRatingObj = firstValid[k];
        break;
      }
    }
    if (!firstRatingObj) {
      addLog('No valid rating object found for PCA.', 'error');
      return;
    }

    // Filter out non-numerical keys.
    const ratingKeys = Object.keys(firstRatingObj).filter((k) => {
      const val = firstRatingObj[k];
      return typeof val === 'number' && val >= 0 && val <= 10;
    });
    if (ratingKeys.length === 0) {
      addLog('No valid numerical attributes found for PCA.', 'error');
      return;
    }

    // 2. Build the data matrix for all valid items.
    const dataMatrix = validRatings.map((item) => {
      const attrs = item.attributes;
      let nestedObj = null;
      for (const k in attrs) {
        if (k !== 'imageUrl' && typeof attrs[k] === 'object') {
          nestedObj = attrs[k];
          break;
        }
      }
      return ratingKeys.map((k) => Number(nestedObj[k]));
    });

    // 3. Run PCA with ml-pca
    const pca = new PCA(dataMatrix);
    const projected = pca.predict(dataMatrix, { nComponents: 3 }).to2DArray();

    // 4. Add new PCA field to each ratedAttributes item
    // E.g., "batch0_pca", "batch1_pca", etc.
    const fieldKey = `batch${pcaIterationCount}_pca`;

    ratedAttributes = ratedAttributes.map((item, idx) => {
      // Only add coordinates if this item was "valid" in the dataMatrix
      if (item.success && item.attributes) {
        // The idx of item in validRatings => find that index
        // Easiest approach: re-check if item is in validRatings
        const validIndex = validRatings.indexOf(item);
        if (validIndex !== -1) {
          return {
            ...item,
            [fieldKey]: projected[validIndex],
          };
        }
      }
      return item;
    });

    addLog(`Performed PCA iteration ${pcaIterationCount} on ${validRatings.length} items`, 'success');
    pcaIterationCount += 1;
    nextPcaThreshold += 5;
  };

  // -----------------------------------
  // 4. Main Execution Flow
  // -----------------------------------
  addLog(`Starting domain list generation for: "${domain}"`);

  // Variables for controlling global attribute fetch
  const FIRST_BATCH_THRESHOLD = 2;
  let globalAttributesFetched = false;
  let globalAttrLocal = null;

  // partialBuffer to accumulate incomplete chunks
  let partialBuffer = '';

  try {
    // Start streaming domain items
    await generateDomainItemsStream(domain, selectedModel, async (chunk) => {
      // 4a. Accumulate chunk in partialBuffer
      partialBuffer += chunk;
      // 4b. Split on commas
      const parts = partialBuffer.split(',');
      const completeMembers = parts.slice(0, -1).map((s) => s.trim()).filter(Boolean);
      // leftover partial chunk
      partialBuffer = parts[parts.length - 1];

      // 4c. Add these new members to domainMembers & pending arrays
      domainMembers.push(...completeMembers);
      completeMembers.forEach((m) => {
        if (!processedMembers.has(m)) {
          pendingRatingMembers.push(m);
        }
      });

      // 4d. If we haven't fetched global attributes yet, and we have enough members, do so now
      if (!globalAttributesFetched && pendingRatingMembers.length >= FIRST_BATCH_THRESHOLD) {
        globalAttributesFetched = true;
        addLog(`Reached first batch threshold with ${pendingRatingMembers.length} members. Fetching global attributes...`);
        try {
          globalAttrLocal = await fetchGlobalAttributes(domain, [...pendingRatingMembers]);
          globalAttributes = globalAttrLocal;
          addLog('Global attributes fetched successfully', 'success');
          // Process all pending members
          await processNewMembers(pendingRatingMembers, globalAttrLocal);
          pendingRatingMembers.length = 0; // clear
        } catch (err) {
          addLog(`Error fetching global attributes: ${err.message}`, 'error');
        }
      } else if (globalAttributesFetched && globalAttrLocal) {
        // Process new members immediately
        await processNewMembers(completeMembers, globalAttrLocal);
      }

      // 4e. Pass the raw chunk to the batchProcessor (for image fetching)
      batchProcessor.processStreamChunk(chunk);

      // 4f. Check if we hit the next PCA threshold
      const validCount = ratedAttributes.filter(
        (item) => item.success && item.attributes
      ).length;
      if (validCount >= nextPcaThreshold) {
        updatePCA();
      }
    });

    // 4g. After streaming completes, check leftover partial
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

    // 4h. Finalize the batchProcessor (catches leftover items for final image fetch)
    await batchProcessor.finalize();

    // 4i. If new valid members arrived after the final chunk, do one more PCA pass if needed
    const finalValidCount = ratedAttributes.filter(
      (item) => item.success && item.attributes
    ).length;
    if (finalValidCount > 0 && finalValidCount >= nextPcaThreshold - 5) {
      updatePCA();
    }

    // 4j. Return our final data structure
    return {
      domain,
      domainMembers,
      globalAttributes,
      ratedAttributes, // includes the final PCA fields (batch0_pca, etc.)
      logs,
      batches,
    };
  } catch (err) {
    addLog(`Error in workflow: ${err.message}`, 'error');
    throw err;
  }
};
