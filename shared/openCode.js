// Defaults are shown only until an administrator saves this section.
export const DEFAULT_OPEN_CODE = {
  enabled: true,
  revision: 0,
  repos: [
    {
      name: 'voicelk_ml',
      label: 'Speech engine',
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
  ].map(repo => ({ ...repo, id: repo.name, visible: true })),
};

export function publicOpenCode(section = DEFAULT_OPEN_CODE) {
  return { enabled: section.enabled, repos: section.enabled
    ? section.repos.filter(repo => repo.visible).map(({ id, name, label, description, stack, url }) => ({ id, name, label, description, stack, url }))
    : [] };
}
