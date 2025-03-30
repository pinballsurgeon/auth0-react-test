// src/services/WorkflowEngine.js
// objective: orchestrate the data generation workflow including member fetching, attribute rating, pca, and image batching, now with enhanced logging for diagnostics.

import { PCA } from 'ml-pca';
import { generateDomainItemsStream, MODELS } from './llmProvider';
import { BatchProcessor } from './batchProcessor';
import { fetchGlobalAttributes, fetchRatedAttributesForItem } from './attributeService';
import { LogService } from './logService'; // Use LogService for consistency if desired, or console.log

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
  selectedModel = MODELS.GPT35, // default model set here
  logCallback = () => {},
}) => {
  // ---- Initialization ----
  console.log(`[WorkflowEngine] Starting workflow for domain: "${domain}" with model: ${selectedModel}`);
  let logs = [];
  let domainMembers = [];
  let globalAttributes = null;
  let ratedAttributes = [];
  let pcaIterationCount = 0;
  let nextPcaThreshold = 5; // how many items needed for next pca run
  const batches = [];
  const processedMembers = new Set(); // track members processed to avoid duplicates
  const pendingRatingMembers = []; // members waiting for global attributes

  // ---- Logging Utility ----
  // use LogService or console.log directly for engine-specific diagnostics
  const engineLog = (message, level = 'info', data = null) => {
    console[level](`[WorkflowEngine] ${message}`, data !== null ? data : '');
    // also push to the main log array if needed for UI display
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const logEntry = { message: `[${timestamp}] [Engine] ${message}`, type: level };
    logs.push(logEntry);
    logCallback(logEntry); // notify external listeners
  };

  // ---- Batch Processing Setup ----
  const imageMap = new Map(); // store fetched image urls { memberName: imageUrl }
  const handleBatchProcessed = (batchResult) => {
    engineLog(`Image batch #${batchResult.batchNumber} processed (${batchResult.items.length} items).`);
    batches.push(batchResult);
    batchResult.items.forEach((itm) => {
      if (itm.text && itm.imageUrl) {
        imageMap.set(itm.text, itm.imageUrl);
      }
    });
  };
  const batchProcessor = new BatchProcessor(handleBatchProcessed, engineLog); // pass engineLog for batch logs

  // ---- Core Processing Functions ----

  /**
   * processMemberRating: fetches rated attributes for a single member.
   */
  const processMemberRating = async (member, globalAttr) => {
    if (!member) {
        engineLog(`Skipping rating for undefined member.`, 'warn');
        return;
    }
    if (processedMembers.has(member)) {
        // engineLog(`Skipping rating for already processed member: ${member}`, 'debug'); // potentially noisy
        return;
    }
    processedMembers.add(member);
    engineLog(`Starting rating fetch for: "${member}"`, 'info');

    // log summary of global attributes being used
    // if (!processedMembers.size === 1) { // only log global attrs once maybe?
    //     engineLog(`Using Global Attributes: ${globalAttr ? Object.keys(globalAttr).join(', ') : 'None'}`, 'debug');
    // }

    try {
      const result = await fetchRatedAttributesForItem(member, globalAttr);
      engineLog(`Raw rating result for "${member}":`, 'debug', result); // log raw result

      // build nested structure safely
      let finalRatedObj = {};
      if (result && typeof result === 'object') {
        // check if result already has member key (case 1) or is just the ratings (case 2)
        if (result.hasOwnProperty(member) && typeof result[member] === 'object') {
          finalRatedObj = { [member]: result[member] };
        } else {
          // assume result is the ratings object itself
          finalRatedObj = { [member]: result };
        }
        engineLog(`Successfully processed ratings for "${member}"`, 'info');
        ratedAttributes.push({
          member,
          attributes: { ...finalRatedObj, imageUrl: null }, // add placeholder for image url
          success: true,
        });
      } else {
         // handle case where result is not a valid object
         engineLog(`Received invalid rating result type for "${member}": ${typeof result}`, 'warn', result);
         ratedAttributes.push({ member, error: 'invalid rating result format', success: false });
      }
    } catch (err) {
      engineLog(`Failed rating fetch for "${member}": ${err.message}`, 'error', err);
      ratedAttributes.push({
        member,
        error: err.message,
        success: false,
      });
    }
  };

  /**
   * processNewMembers: fetch rating data concurrently for an array of members.
   */
  const processNewMembers = async (members, globalAttr) => {
    if (!members || members.length === 0) return;
    engineLog(`Processing ratings for ${members.length} new members: [${members.slice(0, 5).join(', ')}${members.length > 5 ? '...' : ''}]`, 'info');
    // use promise.allsettled to ensure all attempts complete, even if some fail
    const results = await Promise.allSettled(members.map(m => processMemberRating(m, globalAttr)));
    // optional: log summary of settled promises if needed for detailed debugging
    // engineLog(`Rating promises settled for batch of ${members.length}.`, 'debug', results);
  };

  /**
   * updatePCA: recomputes pca when enough valid ratings are available.
   */
  const updatePCA = () => {
    engineLog(`Checking PCA threshold. Current valid ratings: ${ratedAttributes.filter(i => i.success).length}, Threshold: ${nextPcaThreshold}`, 'info');
    const validRatings = ratedAttributes.filter(item => item.success && item.attributes);
    if (validRatings.length === 0) {
      engineLog('PCA check: No valid ratings available to perform PCA.', 'warn');
      return;
    }

    // more robust check for the nested rating object and numeric keys
    let firstValidItem = validRatings[0];
    let memberKey = firstValidItem.member;
    let firstRatingObj = firstValidItem.attributes[memberKey]; // access nested ratings

    if (!firstRatingObj || typeof firstRatingObj !== 'object') {
       engineLog(`PCA check: Could not find valid nested rating object for member "${memberKey}" in first valid item.`, 'error', firstValidItem);
       return;
    }

    const ratingKeys = Object.keys(firstRatingObj).filter(k => typeof firstRatingObj[k] === 'number'); // simplified check for numbers
    if (ratingKeys.length === 0) {
      engineLog(`PCA check: No numeric attributes found for PCA in first valid item's ratings. Keys: ${Object.keys(firstRatingObj).join(', ')}`, 'error');
      return;
    }
    engineLog(`PCA check: Found ${ratingKeys.length} numeric keys for PCA: [${ratingKeys.join(', ')}]`, 'info');

    // build data matrix safely
    const dataMatrix = [];
    const itemsIncludedInPca = []; // track which items contribute to this pca run
    validRatings.forEach(item => {
        let itemMemberKey = item.member;
        let itemRatings = item.attributes[itemMemberKey];
        if (itemRatings && typeof itemRatings === 'object') {
            const row = ratingKeys.map(k => Number(itemRatings[k]) || 0); // default non-numbers to 0
            if (row.length === ratingKeys.length) { // ensure row has correct length
                dataMatrix.push(row);
                itemsIncludedInPca.push(item); // keep track of the item source for mapping results back
            } else {
                 engineLog(`PCA build matrix: Skipped item "${itemMemberKey}" due to mismatched rating keys.`, 'warn');
            }
        } else {
             engineLog(`PCA build matrix: Skipped item "${itemMemberKey}" due to missing/invalid nested ratings.`, 'warn');
        }
    });

    if (dataMatrix.length < 3) { // pca needs sufficient data points (usually more than components)
        engineLog(`PCA check: Insufficient valid data rows (${dataMatrix.length}) to perform PCA (need at least 3).`, 'warn');
        return;
    }

    try {
        engineLog(`Performing PCA iteration ${pcaIterationCount} on ${dataMatrix.length} items...`, 'info');
        const pca = new PCA(dataMatrix);
        const projected = pca.predict(dataMatrix, { nComponents: 3 }).to2DArray();
        const fieldKey = `batch${pcaIterationCount}_pca`;

        // map pca results back to the *original* ratedAttributes array using the tracked items
        let pcaIndex = 0;
        ratedAttributes = ratedAttributes.map(originalItem => {
            // find if this original item was included in the current pca batch
            const includedItemIndex = itemsIncludedInPca.findIndex(incItem => incItem.member === originalItem.member);
            if (includedItemIndex !== -1) {
                // yes, map the corresponding projected coordinates
                const coords = projected[includedItemIndex]; // use the index from itemsIncludedInPca
                return { ...originalItem, [fieldKey]: coords };
            }
            // no, return the item unmodified (it might get pca data in a later batch)
            return originalItem;
        });


        engineLog(`PCA iteration ${pcaIterationCount} successful. Added field '${fieldKey}'.`, 'success');
        pcaIterationCount += 1;
        nextPcaThreshold += 5; // increment threshold for next run
    } catch(pcaError) {
         engineLog(`PCA iteration ${pcaIterationCount} failed: ${pcaError.message}`, 'error', pcaError);
    }
  };

  // -----------------------------------
  // 4. Main Execution Flow
  // -----------------------------------
  engineLog(`Starting domain list generation...`, 'info');
  const FIRST_BATCH_THRESHOLD = 2;
  let globalAttributesFetched = false;
  let globalAttrLocal = null;
  let partialBuffer = ''; // buffer for incoming stream chunks

  try {
    // 4a. start streaming domain items
    await generateDomainItemsStream(domain, selectedModel, async (chunk) => {
      // check for completion signal from llmProvider
      if (chunk === '[STREAM_COMPLETE]') {
          engineLog('Domain item stream completed.', 'info');
          return; // stop processing chunks
      }

      partialBuffer += chunk;
      const parts = partialBuffer.split(','); // split by comma
      // process all parts except the last potentially incomplete one
      const completeMembers = parts.slice(0, -1).map(s => s.trim()).filter(Boolean);
      partialBuffer = parts[parts.length - 1] || ''; // keep last part in buffer

      if (completeMembers.length > 0) {
          engineLog(`Received ${completeMembers.length} members from stream chunk.`, 'debug');
          domainMembers.push(...completeMembers);
          const newPending = [];
          completeMembers.forEach((m) => {
            if (!processedMembers.has(m)) {
              pendingRatingMembers.push(m);
              newPending.push(m); // track newly added pending members for immediate processing if ready
            }
          });

          // --- Attribute Fetching Logic ---
          // fetch global attributes once threshold is met
          if (!globalAttributesFetched && pendingRatingMembers.length >= FIRST_BATCH_THRESHOLD) {
            globalAttributesFetched = true;
            engineLog(`Reached first batch threshold (${pendingRatingMembers.length} members). Fetching global attributes...`, 'info');
            try {
              // make copy of pending members array at this point in time
              const membersForGlobalAttrs = [...pendingRatingMembers];
              globalAttrLocal = await fetchGlobalAttributes(domain, membersForGlobalAttrs);
              globalAttributes = globalAttrLocal; // store globally accessible attributes
              engineLog('Global attributes fetched successfully.', 'success', globalAttributes);
              // process all members that were pending when global attrs were requested
              engineLog(`Processing initial batch of ${membersForGlobalAttrs.length} pending members with global attributes...`, 'info');
              await processNewMembers(membersForGlobalAttrs, globalAttrLocal);
              // remove processed members from pending list
              pendingRatingMembers.splice(0, membersForGlobalAttrs.length);
              engineLog(`Initial pending members processed. Remaining pending: ${pendingRatingMembers.length}`, 'info');

            } catch (err) {
              engineLog(`Error fetching global attributes: ${err.message}`, 'error', err);
              // decide how to proceed: maybe stop workflow, or continue without ratings?
              // for now, log error and continue, ratings might still work if error was transient
            }
          }
          // if global attrs are already fetched, process newly received members immediately
          else if (globalAttributesFetched && globalAttrLocal && newPending.length > 0) {
             engineLog(`Processing ${newPending.length} newly received members immediately...`, 'info');
             await processNewMembers(newPending, globalAttrLocal);
          }

          // pass raw complete members to batch processor for image fetching (it handles batching)
          completeMembers.forEach(member => batchProcessor.processItem(member)); // Changed: Add items individually
      }

      // check pca threshold after processing members
      if (globalAttributesFetched) { // only run pca if we potentially have ratings
        const currentValidCount = ratedAttributes.filter(item => item.success).length;
        if (currentValidCount >= nextPcaThreshold) {
            updatePCA(); // attempt pca update
        }
      }
    }); // end of generateDomainItemsStream callback

    // 4b. after streaming completes, process any leftover partial member
    engineLog('Stream finished. Processing any remaining partial member.', 'info');
    if (partialBuffer.trim()) {
      const lastMember = partialBuffer.trim();
      engineLog(`Processing final member from buffer: "${lastMember}"`, 'debug');
      domainMembers.push(lastMember);
      if (!processedMembers.has(lastMember)) {
        if (globalAttributesFetched && globalAttrLocal) {
          // process immediately if global attrs available
          await processMemberRating(lastMember, globalAttrLocal);
        } else {
          // add to pending (should normally not happen if stream ends after threshold)
          pendingRatingMembers.push(lastMember);
           engineLog(`Added final member "${lastMember}" to pending (global attrs not ready?).`, 'warn');
        }
      }
       batchProcessor.processItem(lastMember); // Add final item to batch processor
    }

    // ensure any remaining pending members are processed (e.g., if stream ended before global attrs)
    if (pendingRatingMembers.length > 0 && globalAttributesFetched && globalAttrLocal) {
         engineLog(`Processing ${pendingRatingMembers.length} remaining pending members after stream end...`, 'info');
         await processNewMembers(pendingRatingMembers, globalAttrLocal);
         pendingRatingMembers.length = 0; // clear
    }


    // 4c. finalize the batch processor to process any remaining items for images
    engineLog('Finalizing image batch processor...', 'info');
    await batchProcessor.finalize();
    engineLog('Image batch processor finalized.', 'info');


    // 4d. reconcile image urls into ratedAttributes
    engineLog('Reconciling image URLs with rated attributes...', 'info');
    let imagesReconciledCount = 0;
    ratedAttributes = ratedAttributes.map((item) => {
      if (item.success && item.attributes) {
        const fetchedUrl = imageMap.get(item.member);
        if (fetchedUrl) {
            imagesReconciledCount++;
            return {
              ...item,
              attributes: { ...item.attributes, imageUrl: fetchedUrl },
            };
        }
      }
      return item; // return unmodified if no image found or item failed
    });
     engineLog(`Image URL reconciliation complete. ${imagesReconciledCount} images mapped.`, 'info');


    // 4e. final pca pass check
    engineLog('Checking for final PCA pass...', 'info');
    const finalValidCount = ratedAttributes.filter(item => item.success).length;
    // run if we are at or past the threshold for the *next* iteration we would have started
    if (finalValidCount >= nextPcaThreshold) {
       engineLog(`Running final PCA pass as valid count (${finalValidCount}) meets threshold (${nextPcaThreshold}).`, 'info');
       updatePCA();
    } else if (finalValidCount > 0 && pcaIterationCount === 0) {
        engineLog(`Running initial PCA pass as stream ended before threshold but valid ratings exist (${finalValidCount}).`, 'info');
        updatePCA(); // ensure at least one PCA run if possible
    }
     else {
        engineLog(`Skipping final PCA pass. Valid count (${finalValidCount}), Next threshold (${nextPcaThreshold}).`, 'info');
    }

    // ---- Final Summary Log ----
    engineLog('Workflow execution finished.', 'success');
    console.groupCollapsed('[Workflow Final Summary]');
    console.log(`Domain: ${domain}`);
    console.log(`Model Used: ${selectedModel}`);
    console.log(`Total Domain Members Identified: ${domainMembers.length}`);
    console.log(`Global Attributes Fetched: ${globalAttributes ? 'Yes' : 'No'}`);
    const successCount = ratedAttributes.filter(i => i.success).length;
    const failCount = ratedAttributes.filter(i => !i.success).length;
    console.log(`Rated Attributes: Total=${ratedAttributes.length}, Success=${successCount}, Fail=${failCount}`);
    console.log(`Image Batches Processed: ${batches.length}`);
    console.log(`PCA Iterations Performed: ${pcaIterationCount}`);
    console.groupEnd();


    // 4f. return the final data structure
    return {
      domain,
      domainMembers,
      globalAttributes,
      ratedAttributes,
      logs,
      batches,
    };

  } catch (err) {
    // catch any error bubbles up from stream processing or initial setup
    engineLog(`Critical error during workflow execution: ${err.message}`, 'error', err);
    // return a partial structure potentially, or re-throw depending on desired frontend handling
    // returning partial data might be better for debugging in the process lens
     return {
       domain,
       domainMembers,
       globalAttributes,
       ratedAttributes, // return whatever was collected
       logs, // logs will contain the error details
       batches,
       error: `Workflow failed: ${err.message}` // add explicit error field
     };
    // throw err; // alternatively re-throw
  }
};
