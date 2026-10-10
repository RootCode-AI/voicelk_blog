// Everything that describes the project rather than a post lives here.
// Fill in the repository links and team once they are ready — cards with an
// empty url render as "link coming soon" instead of a dead link.

import { seoSite } from '../../shared/seo.js';

export const site = {
  name: 'VoiceLK',
  title: 'VoiceLK Journal',
  url: seoSite.url,
  seoTitle: seoSite.title,
  description:
    'Research on Sinhala-English code-switched text-to-speech, including text normalisation, grapheme-to-phoneme conversion, VITS training and evaluation.',
  tagline:
    'Research notes from a final-year project on Sinhala–English code-switched speech synthesis — from text normalisation and G2P to training VITS and serving it.',
  university: 'Rajarata University of Sri Lanka',
  contactEmail: 'rootcode.projects@gmail.com',

  repos: [
    {
      name: 'voicelk_ml',
      label: 'Research code',
      description: 'Text normalisation, code-switched G2P, VITS training and evaluation.',
      stack: 'Python · PyTorch',
      url: '',
    },
    {
      name: 'bridge',
      label: 'TTS bridge',
      description: 'The microservice that serves the trained checkpoints over HTTP.',
      stack: 'Python · FastAPI',
      url: '',
    },
    {
      name: 'voicelk_be',
      label: 'Application backend',
      description: 'Auth, questions, answers and the stored audio records.',
      stack: 'Java · Spring Boot',
      url: '',
    },
    {
      name: 'voicelk_fe',
      label: 'Web client',
      description: 'The React app people use to ask questions and hear the answers.',
      stack: 'React · Vite · Tailwind',
      url: '',
    },
  ],

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
