/**
 * Gemini API Wrapper
 * Handles all communication with Google Gemini REST API
 * Auto-retry with exponential backoff on high demand errors & fallback on quota limits
 */

const GeminiAPI = (() => {
    // Array of fallback models. If quota is exceeded on the first, it tries the next.
    const MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];
    const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

    const MAX_RETRIES = 5;
    const BASE_DELAY_MS = 3000; // 3 seconds initial delay

    /**
     * Sleep helper
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get the API key from config
     */
    function getApiKey() {
        if (typeof CONFIG !== 'undefined' && CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
            return CONFIG.GEMINI_API_KEY;
        }
        throw new Error('API key not found! Copy js/config.example.js to js/config.js and add your Gemini API key.');
    }

    /**
     * Call a specific Gemini model
     */
    async function callModel(prompt, model, apiKey) {
        const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`;

        const body = {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.8,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 4096,
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
            const status = response.status;
            
            // Check if it's a quota exceeded error which requires switching models instead of retrying
            const isQuotaExceeded = status === 429 && errorMsg.toLowerCase().includes('quota exceeded');

            // Retryable errors: rate limit (429 but not quota), server overload (503), internal error (500)
            const isRetryable = !isQuotaExceeded && (status === 429 || status === 503 || status === 500 ||
                errorMsg.toLowerCase().includes('high demand') ||
                errorMsg.toLowerCase().includes('overloaded') ||
                errorMsg.toLowerCase().includes('temporarily'));

            throw { message: errorMsg, status, isRetryable, isQuotaExceeded };
        }

        const data = await response.json();

        // Extract text from response
        if (
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0]
        ) {
            return data.candidates[0].content.parts[0].text;
        }

        throw { message: 'No content in Gemini response.', status: 0, isRetryable: false, isQuotaExceeded: false };
    }

    /**
     * Call the Gemini API with auto-retry and fallback models
     * @param {string} prompt - The full prompt to send
     * @returns {Promise<string>} - Generated text response
     */
    async function generate(prompt) {
        const apiKey = getApiKey();

        for (let m = 0; m < MODELS.length; m++) {
            const model = MODELS[m];

            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    const result = await callModel(prompt, model, apiKey);
                    if (attempt > 0 || m > 0) {
                        console.log(`[Gemini] Succeeded using ${model} (attempt ${attempt + 1})`);
                    }
                    return result;
                } catch (err) {
                    const isLastAttempt = attempt === MAX_RETRIES;
                    const isLastModel = m === MODELS.length - 1;

                    console.warn(`[Gemini] ${model} attempt ${attempt + 1} failed: ${err.message}`);

                    // If quota exceeded, break retry loop and try the next model
                    if (err.isQuotaExceeded) {
                        if (!isLastModel) {
                            console.log(`[Gemini] Quota exceeded for ${model}. Switching to fallback model: ${MODELS[m + 1]}`);
                            break; // breaks the attempt loop, moves to next model
                        } else {
                            throw new Error(`Gemini API Error: All models exceeded quota. Please try again tomorrow.`);
                        }
                    }

                    // If it's a retryable error and not the last attempt, wait and retry
                    if (err.isRetryable && !isLastAttempt) {
                        const delay = BASE_DELAY_MS * Math.pow(1.5, attempt); // 3s, 4.5s, 6.75s, 10s...
                        console.log(`[Gemini] Retrying ${model} in ${(delay / 1000).toFixed(1)}s...`);
                        await sleep(delay);
                        continue;
                    }

                    // If we reached max retries for a retryable error, try next model if available
                    if (err.isRetryable && isLastAttempt && !isLastModel) {
                        console.log(`[Gemini] Max retries reached for ${model}. Switching to fallback model: ${MODELS[m + 1]}`);
                        break; // breaks attempt loop, moves to next model
                    }

                    // If it's not retryable (e.g. bad request, invalid API key) or we ran out of models
                    if (!err.isRetryable || isLastModel) {
                        throw new Error(`Gemini API Error: ${err.message}`);
                    }
                }
            }
        }

        throw new Error('All models and retries failed.');
    }

    /**
     * Validate that the API key works
     * @returns {Promise<boolean>}
     */
    async function validateKey() {
        try {
            await generate('Say "OK" in one word.');
            return true;
        } catch {
            return false;
        }
    }

    return { generate, validateKey };
})();
