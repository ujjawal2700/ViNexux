import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export class ApiResponse {
  static success(res, message = 'Request successful', data = {}, statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }
}
