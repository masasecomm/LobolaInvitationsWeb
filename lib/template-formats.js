export const templateFormats = {
  standard: {
    label: 'Standard portrait',
    dimensions: '1080 × 1350 px'
  },
  'hd-mobile': {
    label: 'HD Mobile',
    dimensions: '1080 × 1920 px'
  },
  'hd-landscape': {
    label: 'HD Landscape',
    dimensions: '1920 × 1080 px'
  }
};

export function getTemplateFormat(format) {
  return templateFormats[format] ? { id: format, ...templateFormats[format] } : { id: 'standard', ...templateFormats.standard };
}
