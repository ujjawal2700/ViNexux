# Product image editing and catalog investigation — 20 October 2026

## Findings and fixes

- Product editing sent every field back, even for a gallery-only change. Products imported without category specifications, or carrying older required-field data, could therefore fail image replacement. Existing edits now submit only fields intentionally changed, validate the fields being changed, and preserve unrelated stock, visibility, category assignments and legacy values. New products still validate their required fields. Draft saves are labeled as drafts.
- The product service revalidated category specifications and every Mongoose field on image-only saves. Category rules now run when the category/specifications change; document validation checks modified paths. Nullable product URL and information phone fields no longer crash when cleared.
- Uploaded gallery assets could be orphaned when the following database write failed or the product disappeared. Failure now attempts deletion of the newly uploaded asset. Successful uploads return their exact image metadata instead of making the browser guess the last gallery entry. Failed uploads remain staged for retry.
- Gallery saves now carry an expected set of image identities. A stale browser receives a conflict instead of deleting another session’s uploaded images. Atomic uploads increment the gallery document version. Removed product assets are deleted after the gallery is persisted; the existing durable pending-deletion list retains cleanup failures for retry on the next save. Legacy Cloudinary delivery URLs with transformation/version segments can supply missing public IDs.
- Image URL errors previously matched the general product URL field first. Image/specification errors now select the appropriate tab and field. Optional field errors and duplicate SKU/model errors have actionable field messages.
- SVG support was inconsistent across image inputs and upload routes. Product galleries, generic uploads (brands/categories/footer), CMS banners/badges/website assets, bento banners, themes, campaign artwork, document-image inputs and ZIP imports now accept SVG. The common storage service rasterizes images to WebP before storage, caps dimensions at 2000 pixels on the long edge without upscaling, and strips source metadata. Invalid image decoding fails with a 400 instead of uploading the original. SVG scripts, foreign objects, entity declarations and external resource references are rejected. This supports SVG vector artwork; it does not add Illustrator/EPS uploads.
- Deleting a category formerly called Product.deleteMany for the category and descendants. It now refuses deletion when any active or inactive product references that tree through primary or secondary category links. Category removal never cascades into deleting products. Confirmation text explains reassignment.

Gallery removal is committed when Save & Publish / Save Draft succeeds. Removing an image locally and cancelling keeps the stored product intact. Backend storage cleanup failures remain visible and retryable; an unavailable provider cannot guarantee immediate deletion.

## Read-only business-data investigation

The configured database contained 50 products: 49 active and one inactive. Two active products have no category assigned; follow-up verified that these are unassigned products, not references to deleted category records. No business records were changed by the diagnostic queries.

Available October Product audit entries did not show a deletion. The visibility event found was an explicit product PUT on 17 October changing false to true. Those records cannot prove or disprove a prior disappearance report. The category cascade was a reproducible deletion path in the code and is now prevented. There is no evidence here to attribute missing products to a particular administrator or an automatic background job. Historical deleted records were not reconstructed.

## Verification

- 378 unit tests passed, including SVG-to-WebP bytes at the Cloudinary upload-stream boundary, unsafe SVG rejection, image cleanup failure/retry, legacy image-only edits, concurrent-gallery protection and category deletion guards.
- 231 API tests passed.
- 16 browser regressions passed for product image replacement/retry/error focus and existing banner/theme workflows. Browser APIs were mocked; these tests did not edit live products.
- Seven relevant real-database integration files passed: adminCategory, adminProduct, productImageEditing, productImport, storage, adminCms and campaigns. These used only disposable databases on a temporary local replica set and development storage/messaging providers.
- Real Cloudinary verification uploaded a temporary 32x16 SVG through the common storage service, confirmed the stored asset was a 72-byte WebP, deleted it, and verified Cloudinary returned not found. No temporary verification asset remains.
- Frontend production build passed. Lint completed with existing warnings and no errors. git diff --check passed.

The tests exercise both the actual API/database flow and the actual Cloudinary conversion/deletion boundary; they do not claim a live production-product edit or a deployment. Changes are local and ready to review.
