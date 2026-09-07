/**
 * Recursively sanitizes objects and arrays by stripping keys starting with '$' or containing '.'
 * to prevent NoSQL query operator injection attacks.
 * 
 * @param {any} target
 * @returns {any} Sanitized output
 */
export const sanitizeData = (target) => {
  if (target === null || target === undefined) {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeData(item));
  }

  if (typeof target === 'object' && target.constructor === Object) {
    const cleanObject = {};
    for (const key of Object.keys(target)) {
      // Strip any property key starting with '$' or containing '.'
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      cleanObject[key] = sanitizeData(target[key]);
    }
    return cleanObject;
  }

  return target;
};

/**
 * Express middleware to sanitize req.body, req.query, and req.params against NoSQL injection.
 */
export const mongoSanitize = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeData(req.body);
  }
  if (req.query) {
    req.query = sanitizeData(req.query);
  }
  if (req.params) {
    req.params = sanitizeData(req.params);
  }
  next();
};

export default mongoSanitize;
