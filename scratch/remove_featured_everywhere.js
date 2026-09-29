import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import mongoose from 'mongoose';

// 1. Update Product.js model
const productModelPath = path.resolve('backend/src/models/Product.js');
let prodModel = fs.readFileSync(productModelPath, 'utf8');
prodModel = prodModel.replace(/\s*isFeatured:\s*\{\s*type:\s*Boolean,\s*default:\s*false,\s*\},/g, '');
prodModel = prodModel.replace(/\s*\/\/\s*Compound index for querying active featured products[^\n]*\n\s*productSchema\.index\(\{\s*isFeatured:\s*1,\s*isActive:\s*1\s*\}\);/g, '');
fs.writeFileSync(productModelPath, prodModel, 'utf8');
console.log('Product.js model updated');

// 2. Update product.service.js
const prodServicePath = path.resolve('backend/src/services/product.service.js');
let prodService = fs.readFileSync(prodServicePath, 'utf8');
prodService = prodService.replace(/,\s*isFeatured\s*=\s*false/g, '');
prodService = prodService.replace(/\s*isFeatured,\s*/g, '\n');
prodService = prodService.replace(/\s*\/\/\s*Filter by isFeatured flag\s*if\s*\(isFeatured\s*!==\s*undefined\)\s*\{\s*filter\.isFeatured\s*=\s*isFeatured\s*===\s*'true'\s*\|\|\s*isFeatured\s*===\s*true;\s*\}/g, '');
prodService = prodService.replace(/\s*if\s*\(updateData\.isFeatured\s*!==\s*undefined\)\s*product\.isFeatured\s*=\s*updateData\.isFeatured;/g, '');
fs.writeFileSync(prodServicePath, prodService, 'utf8');
console.log('product.service.js updated');

// 3. Update catalog.service.js
const catServicePath = path.resolve('backend/src/services/catalog.service.js');
let catService = fs.readFileSync(catServicePath, 'utf8');
catService = catService.replace(/\s*if\s*\(query\.isFeatured\s*!==\s*undefined\)\s*match\.isFeatured\s*=\s*String\(query\.isFeatured\)\s*===\s*'true';/g, '');
fs.writeFileSync(catServicePath, catService, 'utf8');
console.log('catalog.service.js updated');

// 4. Update MongoDB Database
async function cleanupDB() {
  try {
    await connectDB();
    const prodCol = mongoose.connection.collection('products');
    
    // Unset isFeatured from all documents
    const unsetRes = await prodCol.updateMany({}, { $unset: { isFeatured: "" } });
    console.log(`Unset isFeatured from ${unsetRes.modifiedCount} products in MongoDB.`);

    // Drop index if exists
    try {
      await prodCol.dropIndex('isFeatured_1_isActive_1');
      console.log('Dropped isFeatured_1_isActive_1 index from products collection.');
    } catch (e) {
      console.log('Index drop info:', e.message);
    }

  } catch (err) {
    console.error('DB cleanup error:', err);
  } finally {
    await disconnectDB();
  }
}

cleanupDB();
