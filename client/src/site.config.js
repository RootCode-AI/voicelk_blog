// Shared product information; repository cards are managed in Admin > Open code.
import { seoSite } from '../../shared/seo.js';

export const site = {
  name: seoSite.name,
  title: seoSite.name,
  url: seoSite.url,
  seoTitle: seoSite.title,
  description: seoSite.description,
  heroHeadline: 'VoiceLK brings words to life',
  heroSubheading: 'Sinhala & English.',
  tagline:
    'VoiceLK turns Sinhala–English text into speech. A product built from research, designed for the way you speak.',
  university: 'Rajarata University of Sri Lanka',
  contactEmail: 'rootcode.projects@gmail.com',



  pipeline: [
    {
      step: '01',
      title: 'Normalise the text',
      body: 'Numbers, dates, abbreviations and mixed scripts are expanded into words a speaker would actually say, in the right language.',
    },
    {
      step: '02',
      title: 'Turn letters into sounds',
      body: 'A code-switched grapheme-to-phoneme front-end decides, word by word, whether it is reading Sinhala or English and emits one shared phoneme sequence.',
    },
    {
      step: '03',
      title: 'Train the voice',
      body: 'A VITS model learns to map those phonemes straight to a waveform, with multi-speaker and single-speaker runs tracked checkpoint by checkpoint.',
    },
    {
      step: '04',
      title: 'Serve it',
      body: 'A small FastAPI bridge renders audio on request; the application stores every clip together with the checkpoint that produced it.',
    },
  ],

  // { name: 'Full Name', role: 'Model training', url: 'https://github.com/...' }
  team: [],
};
