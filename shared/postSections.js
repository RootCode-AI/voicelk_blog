export const postSections = {
  journey: {
    label: 'Journey', path: '/journey', title: 'Our product journey',
    description: 'Problems we faced, experiments we tried, and lessons learned while building the VoiceLK Sinhala-English text-to-speech product.',
    empty: 'Our first journey update is on its way.',
  },
  research: {
    label: 'Research', path: '/research', title: 'Results & outcomes',
    description: 'The research behind VoiceLK: findings, evaluation results and speech samples that inform the product.',
    empty: 'Research results will appear here when they are published.',
  },
};

// Posts created before sections were introduced belong to Journey.
export const sectionForPost = (post) => postSections[post?.section] || postSections.journey;
export const sectionFromPath = (path) => Object.keys(postSections).find((key) => postSections[key].path === path);
export const isPostListing = (path) => path === '/blog' || Boolean(sectionFromPath(path));
