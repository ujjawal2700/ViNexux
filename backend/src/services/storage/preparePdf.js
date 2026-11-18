import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import sharp from 'sharp';
import { AppError } from '../../utils/AppError.js';

// Preserve text, vectors and page layout. Recompress ordinary JPEG scans only;
// masks, non-RGB colour spaces and special decode instructions stay untouched.
export async function preparePdfBuffer(buffer) {
  try {
    if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('Invalid PDF');
    const pdf = await PDFDocument.load(buffer, { updateMetadata: false });
    if (pdf.getPageCount() > 300) throw new Error('Too many pages');
    const objects = pdf.context.enumerateIndirectObjects();
    if (objects.length > 50000) throw new Error('Too many objects');
    // Rewriting would invalidate an existing digital signature.
    if (objects.some(([, object]) => object?.get?.(PDFName.of('Type')) === PDFName.of('Sig') || object?.has?.(PDFName.of('ByteRange')))) {
      return { buffer, mimetype: 'application/pdf', extension: 'pdf' };
    }
    for (const [ref, object] of objects) {
      if (!(object instanceof PDFRawStream)) continue;
      const dict = object.dict;
      if (dict.get(PDFName.of('Subtype')) !== PDFName.of('Image') || dict.get(PDFName.of('Filter')) !== PDFName.of('DCTDecode')
        || dict.get(PDFName.of('ColorSpace')) !== PDFName.of('DeviceRGB')
        || ['SMask', 'Mask', 'Decode', 'DecodeParms'].some(key => dict.has(PDFName.of(key)))) continue;
      const source = Buffer.from(object.getContents());
      try {
        const { data, info } = await sharp(source, { limitInputPixels: 40000000 }).resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
        if (data.length >= source.length) continue;
        const updated = dict.clone();
        updated.set(PDFName.of('Width'), pdf.context.obj(info.width));
        updated.set(PDFName.of('Height'), pdf.context.obj(info.height));
        updated.set(PDFName.of('BitsPerComponent'), pdf.context.obj(8));
        pdf.context.assign(ref, pdf.context.stream(data, updated));
      } catch { /* Keep unsupported embedded images intact. */ }
    }
    const optimized = Buffer.from(await pdf.save({ useObjectStreams: true, updateFieldAppearances: false }));
    return { buffer: optimized.length < buffer.length ? optimized : buffer, mimetype: 'application/pdf', extension: 'pdf' };
  } catch {
    throw new AppError('Upload a valid, unencrypted PDF with no more than 300 pages.', 400, 'VALIDATION_ERROR');
  }
}
