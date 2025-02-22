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
  // 2. Batch Processor Setup
  // ----------------------------
  // We'll store the images from the batch in a map so we can reconcile them later
  const imageMap = new Map(); // key: item text, value: imageUrl

  const handleBatchProcessed = (batchResult) => {
    batches.push(batchResult);
    // For each item, store its imageUrl in the imageMap
    batchResult.items.forEach((itm) => {
      // itm.text is the domain member name extracted from the chunk
      // itm.imageUrl is the fetched URL from the batchProcessor
      if (itm.text && itm.imageUrl) {
        imageMap.set(itm.text, itm.imageUrl);
      }
    });
  };

  // Create the batch processor
  const batchProcessor = new BatchProcessor(handleBatchProcessed, addLog);

  // ----------------------------
  // 3. Helper Functions
  // ----------------------------

  /**
   * processMemberRating: fetches rated attributes for a single member
   * and initially sets the imageUrl to null or a placeholder—later reconciled after batch finalize.
   */
  const processMemberRating = async (member, globalAttr) => {
    if (processedMembers.has(member)) return; // avoid double-processing
    processedMembers.add(member);

    try {
      const result = await fetchRatedAttributesForItem(member, globalAttr);
      // We assume `result` might look like:
      // { "1967 Ford Mustang GT": { "acceleration-0-60": 8, "top-speed": 9, ... } }
      // or possibly just { "acceleration-0-60": 8, "top-speed": 9, ... }.

      // Build a nested structure to match the PCA logic (where we skip "imageUrl" key).
      let finalRatedObj = {};
      if (result && typeof result === 'object') {
        if (result.hasOwnProperty(member)) {
          finalRatedObj = { [member]: result[member] };
        } else {
          finalRatedObj = { [member]: result };
        }
      }

      // For now, set imageUrl to null (or a placeholder).
      ratedAttributes.push({
        member,
        attributes: {
          ...finalRatedObj,
          imageUrl: null,
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
   * Called once global attributes are available.
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

    // Identify the numeric rating keys
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

    const ratingKeys = Object.keys(firstRatingObj).filter((k) => {
      const val = firstRatingObj[k];
      return typeof val === 'number' && val >= 0 && val <= 10;
    });
    if (ratingKeys.length === 0) {
      addLog('No valid numerical attributes found for PCA.', 'error');
      return;
    }

    // Build the data matrix
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

    // Run PCA with ml-pca
    const pca = new PCA(dataMatrix);
    const projected = pca.predict(dataMatrix, { nComponents: 3 }).to2DArray();

    // Create new PCA field
    const fieldKey = `batch${pcaIterationCount}_pca`;

    // Update each valid item with the new PCA array
    ratedAttributes = ratedAttributes.map((item, idx) => {
      if (item.success && item.attributes) {
        const validIndex = validRatings.indexOf(item);
        if (validIndex !== -1) {
          return { ...item, [fieldKey]: projected[validIndex] };
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

  const FIRST_BATCH_THRESHOLD = 2;
  let globalAttributesFetched = false;
  let globalAttrLocal = null;
  let partialBuffer = '';

  try {
    // 4a. Start streaming domain items
    await generateDomainItemsStream(domain, selectedModel, async (chunk) => {
      partialBuffer += chunk;
      // Split on commas
      const parts = partialBuffer.split(',');
      const completeMembers = parts.slice(0, -1).map((s) => s.trim()).filter(Boolean);
      partialBuffer = parts[parts.length - 1];

      // Update domainMembers
      domainMembers.push(...completeMembers);
      completeMembers.forEach((m) => {
        if (!processedMembers.has(m)) {
          pendingRatingMembers.push(m);
        }
      });

      // Fetch global attributes when threshold is reached
      if (!globalAttributesFetched && pendingRatingMembers.length >= FIRST_BATCH_THRESHOLD) {
        globalAttributesFetched = true;
        addLog(`Reached first batch threshold (${FIRST_BATCH_THRESHOLD} members). Fetching global attributes...`);
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

      // Pass the raw chunk to the batchProcessor (for image fetching)
      batchProcessor.processStreamChunk(chunk);

      // Check if we hit the next PCA threshold
      const validCount = ratedAttributes.filter(
        (item) => item.success && item.attributes
      ).length;
      if (validCount >= nextPcaThreshold) {
        updatePCA();
      }
    });

    // 4b. After streaming completes, check leftover partial
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

    // 4c. Finalize the batch processor to ensure all images are fetched
    await batchProcessor.finalize();

    // 4d. One final pass to reconcile images for all rated items
    //     Some items (especially early ones) might not have had the image yet
    //     if the BatchProcessor hadn't completed. Now we have a complete imageMap.
    ratedAttributes = ratedAttributes.map((item) => {
      if (item.success && item.attributes) {
        const existingUrl = item.attributes.imageUrl;
        const fetchedUrl = imageMap.get(item.member);
        const finalUrl = fetchedUrl || existingUrl || null;
        return {
          ...item,
          attributes: {
            ...item.attributes,
            imageUrl: finalUrl,
          },
        };
      }
      return item;
    });

    // 4e. Possibly run a final PCA pass if we want all items to be up to date
    //     (Only if we have new items that arrived after the last threshold check.)
    const finalValidCount = ratedAttributes.filter(
      (item) => item.success && item.attributes
    ).length;
    if (finalValidCount >= nextPcaThreshold - 5) {
      // Example logic: if we just needed one or two more items to complete the batch,
      // we can re-run the PCA to include them. Adjust if your logic differs.
      updatePCA();
    }

    // 4f. Return our final data structure
    return {
      domain,
      domainMembers,
      globalAttributes,
      ratedAttributes, // includes final PCA fields & reconciled image URLs
      logs,
      batches,
    };
  } catch (err) {
    addLog(`Error in workflow: ${err.message}`, 'error');
    throw err;
  }
};
