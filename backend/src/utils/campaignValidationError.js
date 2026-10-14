import { AppError } from './AppError.js';
import { campaignValidationDetails } from '../../../shared/campaignValidation.js';
export const campaignValidationError = issues => new AppError('Please check the highlighted fields.', 400, 'CAMPAIGN_VALIDATION_ERROR', campaignValidationDetails(issues));
