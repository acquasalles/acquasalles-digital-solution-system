# Lambda Function Update Instructions

## Overview
The Lambda function (`lambda-report.mjs`) already supports multi-page PDF generation. The current implementation should work correctly with the new multi-page HTML structure.

## What Changed in the Frontend

1. **New Function**: `extractAllPagesHTML()` in `src/lib/extractFirstPageHTML.ts`
   - Iterates through all pages sequentially
   - Captures HTML for each page by programmatically changing the page number
   - Combines all pages into a single HTML document with proper page break styling

2. **Updated Handler**: `handleDownloadPDF()` in `src/components/A4ReportPreview.tsx`
   - Removed restriction requiring user to be on page 1
   - Uses async page iteration to capture all pages
   - Restores original page number after PDF generation
   - Passes complete multi-page HTML to Lambda

## Lambda Function - No Changes Required

The existing Lambda function should work correctly because:

1. **Page Breaks**: The new HTML includes CSS for page breaks:
   ```css
   .report-page {
     page-break-after: always;
     page-break-inside: avoid;
   }
   ```

2. **Puppeteer Support**: Puppeteer's `page.pdf()` method respects CSS page break properties

3. **Landscape Orientation**: Already configured correctly (`landscape: true`)

4. **Format**: Already set to A4 (`format: "A4"`)

## Testing the Implementation

1. Navigate to the report preview page
2. Click "Download PDF" button from any page
3. The system will:
   - Automatically iterate through all pages (you may see pages changing briefly)
   - Capture HTML for each page
   - Send combined HTML to Lambda
   - Generate a complete multi-page PDF
   - Download the PDF with all pages included

## Expected Behavior

- **Page 1**: Client information and executive summary
- **Pages 2-N**: Volume consumption analysis (4 points per page)
- **Last Page**: Detailed measurement data table

## Troubleshooting

If the Lambda function doesn't generate page breaks correctly, you may need to add this option to the `page.pdf()` call:

```javascript
const pdfBuffer = await page.pdf({
  format: "A4",
  landscape: true,
  printBackground: true,
  preferCSSPageSize: true  // Add this line
});
```

This ensures Puppeteer respects the CSS `@page` rules.

## Optional Lambda Enhancement

If you want to improve page break handling, update line 40-44 in `lambda-report.mjs`:

```javascript
// Replace current pdf() call with:
const pdfBuffer = await page.pdf({
  format: "A4",
  landscape: true,
  printBackground: true,
  preferCSSPageSize: true,
  margin: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  }
});
```

This gives you more control over page breaks and ensures zero margins as specified in the CSS.
