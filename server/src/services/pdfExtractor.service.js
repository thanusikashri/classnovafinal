/**
 * PDF Text Extraction Service
 * Uses PDFParse to extract readable text, clean page artifacts,
 * and detect corrupted, encrypted, or image-only (scanned) documents.
 */

const { PDFParse } = require('pdf-parse');

/**
 * Clean and normalize extracted text from PDF
 * Removes page number headers/footers, excess whitespace, and control characters
 */
function cleanExtractedText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  return rawText
    // Remove null bytes and non-printable control characters (except newline, tab, cr)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove common PDF pagination stamps like "-- 1 of 5 --" or "Page 1 of 10"
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    .replace(/(?:Page|p\.)\s+\d+\s*(?:of|\/)\s*\d+/gi, '')
    // Normalize Windows/Mac line endings to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace 3+ consecutive newlines with 2 newlines (preserve paragraphs)
    .replace(/\n{3,}/g, '\n\n')
    // Replace multiple horizontal spaces/tabs with single space
    .replace(/[ \t]+/g, ' ')
    // Trim surrounding whitespace
    .trim();
}

/**
 * Extracts readable text from a PDF buffer
 * @param {Buffer} buffer - Raw file buffer of uploaded PDF
 * @returns {Promise<{text: string, pagesCount: number, totalLength: number, preview: string}>}
 */
async function extractTextFromPdfBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid file buffer supplied for PDF extraction.');
  }

  if (buffer.length === 0) {
    throw new Error('The uploaded PDF file is empty (0 bytes).');
  }

  // Validate PDF magic number (%PDF-)
  const magicHeader = buffer.slice(0, 5).toString('ascii');
  if (!magicHeader.startsWith('%PDF-')) {
    throw new Error('The uploaded file is not a valid PDF document. Please upload a standard .pdf file.');
  }

  let parser;
  let result;

  try {
    parser = new PDFParse({ data: buffer });
    result = await parser.getText();
  } catch (err) {
    const errMsg = err.message || '';
    const errName = err.name || '';

    if (errName === 'PasswordException' || errMsg.toLowerCase().includes('password')) {
      throw new Error('The uploaded PDF is password-protected or encrypted. Please upload an unlocked document.');
    }
    if (errName === 'InvalidPDFException' || errMsg.toLowerCase().includes('invalid pdf')) {
      throw new Error('The uploaded PDF is corrupted or has an invalid document structure.');
    }
    throw new Error(`Failed to read PDF document: ${errMsg}`);
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch (_) {
        // Ignore parser cleanup errors
      }
    }
  }

  const rawText = result?.text || '';
  const pagesCount = result?.total || result?.pages?.length || 1;
  const cleanedText = cleanExtractedText(rawText);

  // Analyze alphanumeric content to detect image-only / scanned PDFs
  const alphanumericChars = (cleanedText.match(/[a-zA-Z0-9]/g) || []).length;

  if (cleanedText.length === 0 || alphanumericChars < 30) {
    throw new Error(
      'The uploaded PDF does not contain extractable text (it appears to be a scanned image or empty document). ' +
      'Optical Character Recognition (OCR) is required to convert scanned images to readable text before quiz generation.'
    );
  }

  return {
    text: cleanedText,
    pagesCount,
    totalLength: cleanedText.length,
    alphanumericCount: alphanumericChars,
    preview: cleanedText.slice(0, 300)
  };
}

module.exports = {
  extractTextFromPdfBuffer,
  cleanExtractedText
};
