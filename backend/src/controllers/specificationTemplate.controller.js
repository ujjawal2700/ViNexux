import { SpecificationTemplate } from '../models/SpecificationTemplate.js';
import { specificationKey } from '../../../shared/specificationTemplates.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
const duplicateName = error => {
  if (error.code === 11000) throw new AppError('A specification template with this name already exists.', 409, 'CONFLICT', [{ path: 'name', message: 'Choose a different template name.' }]);
  throw error;
};
export const listSpecificationTemplates = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normalized = specificationKey(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = search ? { $or: [{ nameKey: new RegExp(normalized, 'i') }, { name: new RegExp(escaped, 'i') }, { description: new RegExp(escaped, 'i') }] } : {};
  const [templates, total] = await Promise.all([
    SpecificationTemplate.find(filter).sort({ nameKey: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    SpecificationTemplate.countDocuments(filter),
  ]);
  ApiResponse.success(res, 'Specification templates retrieved', { templates, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});
export const createSpecificationTemplate = asyncHandler(async (req, res) => {
  try {
    const template = await SpecificationTemplate.create({ ...req.body, nameKey: specificationKey(req.body.name), createdBy: req.user._id, updatedBy: req.user._id });
    ApiResponse.success(res, 'Specification template created', { template }, 201);
  } catch (error) { duplicateName(error); }
});
export const updateSpecificationTemplate = asyncHandler(async (req, res) => {
  const { expectedRevision, ...fields } = req.body;
  try {
    const template = await SpecificationTemplate.findOneAndUpdate({ _id: req.params.templateId, revision: expectedRevision }, {
      $set: { ...fields, nameKey: specificationKey(fields.name), updatedBy: req.user._id }, $inc: { revision: 1 },
    }, { new: true, runValidators: true });
    if (!template) {
      if (await SpecificationTemplate.exists({ _id: req.params.templateId })) throw new AppError('This template was updated by another admin. Reopen it before saving your changes.', 409, 'CONFLICT');
      throw new AppError('Specification template not found', 404, 'NOT_FOUND');
    }
    ApiResponse.success(res, 'Specification template updated', { template });
  } catch (error) { duplicateName(error); }
});
export const deleteSpecificationTemplate = asyncHandler(async (req, res) => {
  const template = await SpecificationTemplate.findByIdAndDelete(req.params.templateId);
  if (!template) throw new AppError('Specification template not found', 404, 'NOT_FOUND');
  ApiResponse.success(res, 'Specification template deleted', { deleted: true });
});
