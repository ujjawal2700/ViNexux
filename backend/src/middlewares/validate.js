import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export const validate = (schema) => async (req, res, next) => {
  try {
    if (schema.body) {
      req.body = await schema.body.parseAsync(req.body);
    }
    if (schema.query) {
      req.query = await schema.query.parseAsync(req.query);
    }
    if (schema.params) {
      req.params = await schema.params.parseAsync(req.params);
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
