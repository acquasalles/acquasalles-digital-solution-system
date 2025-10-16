# Multi-Page PDF Generation - Test Checklist

## Pre-Testing Setup
- [ ] Ensure Lambda function is deployed and accessible
- [ ] Verify Lambda URL is correct in `src/lib/generatePDFWithLambda.ts`
- [ ] Check that report data is loaded with multiple pages
- [ ] Confirm you have volume data to generate volume pages

## Functional Tests

### 1. Basic PDF Generation
- [ ] Open report preview page
- [ ] Navigate to page 1
- [ ] Click "Download PDF" button
- [ ] Verify PDF downloads successfully
- [ ] Open PDF and confirm it contains all pages
- [ ] Check page count matches the displayed "Page X of Y"

### 2. Download from Different Pages
- [ ] Navigate to page 2 (volume page)
- [ ] Click "Download PDF"
- [ ] Verify it still generates complete PDF (not just current page)
- [ ] Navigate to last page (table page)
- [ ] Click "Download PDF"
- [ ] Verify complete PDF is generated

### 3. Page Content Verification
- [ ] **Page 1 - Summary**:
  - [ ] Client information displays correctly
  - [ ] Executive summary shows correct statistics
  - [ ] Non-conformities table is present (if any exist)
  - [ ] Header and footer are properly formatted

- [ ] **Volume Pages (if applicable)**:
  - [ ] Each page shows 4 collection points in 2x2 grid
  - [ ] Bar charts are visible
  - [ ] Statistics are displayed correctly
  - [ ] Outorga limits are shown (if defined)
  - [ ] Non-conformant days are listed

- [ ] **Table Page (if applicable)**:
  - [ ] Header row with collection point names
  - [ ] Sub-header with parameter names and units
  - [ ] Data rows show measurements
  - [ ] Maximum 30 records displayed
  - [ ] Table formatting is clean

### 4. Visual Quality
- [ ] All pages use A4 landscape orientation (297mm x 210mm)
- [ ] Page breaks occur cleanly (no content split between pages)
- [ ] Fonts render correctly at 9px base size
- [ ] Colors match the preview
- [ ] Tables are properly aligned
- [ ] Borders and spacing are consistent
- [ ] Background colors are visible

### 5. Performance Tests
- [ ] PDF generation completes within reasonable time (< 30 seconds)
- [ ] Page flashing during capture is brief and acceptable
- [ ] Original page is restored after generation
- [ ] No browser freezing or hanging
- [ ] Multiple consecutive downloads work correctly

### 6. Edge Cases
- [ ] **No Volume Data**:
  - [ ] Generate PDF with only summary and table pages
  - [ ] Verify page count is correct (1 + 0 + 1 = 2 pages)

- [ ] **No Table Data**:
  - [ ] Generate PDF with only summary and volume pages
  - [ ] Verify last page is a volume page, not table

- [ ] **Single Volume Page**:
  - [ ] Test with 1-4 collection points
  - [ ] Verify single volume page renders correctly

- [ ] **Many Volume Pages**:
  - [ ] Test with 10+ collection points
  - [ ] Verify all pages are captured (should be 3+ volume pages)

### 7. Error Handling
- [ ] Test with network disconnected (should show error message)
- [ ] Test Lambda timeout scenario
- [ ] Verify error messages are user-friendly
- [ ] Confirm original page is restored even on error

## Lambda-Specific Tests (Optional)

If you need to update the Lambda function with the enhanced version:

- [ ] Deploy `lambda-report-enhanced.mjs`
- [ ] Test that page breaks work correctly
- [ ] Verify margins are zero as expected
- [ ] Check that `preferCSSPageSize` improves page breaks
- [ ] Compare PDF quality before and after enhancement

## Browser Compatibility
- [ ] Chrome/Edge - Test PDF generation
- [ ] Firefox - Test PDF generation
- [ ] Safari - Test PDF generation

## Known Behavior
- ✅ Pages will briefly flash during capture (this is normal)
- ✅ Loading indicator shows "Gerando PDF..." during process
- ✅ Console logs show progress: "Generating PDF with N pages..."
- ✅ Original page number is restored after completion

## Success Criteria
- ✅ All pages are included in the PDF
- ✅ Pages appear in correct order (summary → volume → table)
- ✅ Visual styling matches the preview exactly
- ✅ Page breaks are clean (no split content)
- ✅ File downloads with correct naming format
- ✅ User experience is smooth and intuitive

## Troubleshooting Guide

### PDF only has first page
- Check that `extractAllPagesHTML` is being called (not `extractFirstPageHTML`)
- Verify `totalPages` calculation is correct
- Check console for error messages during page iteration

### Page breaks don't work
- Deploy `lambda-report-enhanced.mjs` with `preferCSSPageSize: true`
- Verify CSS includes `page-break-after: always` in `.report-page` class
- Check Puppeteer version in Lambda supports page breaks

### Pages have wrong content
- Verify `data-page` attributes are set correctly
- Check that `currentPage` state updates properly
- Ensure 100ms delay is sufficient for React rendering

### Download fails
- Check Lambda URL in `generatePDFWithLambda.ts`
- Verify Lambda has correct permissions
- Check browser console for network errors
- Confirm Lambda timeout is set high enough (recommend 30+ seconds)

### Styling looks wrong
- Verify Tailwind CSS CDN is accessible
- Check that all custom CSS is included in HTML
- Ensure `printBackground: true` is set in Lambda

## Reporting Issues
If tests fail, please provide:
1. Browser and version
2. Error message from console
3. Which test failed
4. Screenshot of PDF output (if generated)
5. Number of pages expected vs. received
