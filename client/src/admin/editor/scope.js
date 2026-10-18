import { createContext, useContext } from 'react';

// Which desk the post list and editor are serving. The admin desk works on every
// post; the writing desk (bloggers) only on the signed-in blogger's own, without
// the admin-only options. The server enforces the same rules.
export const ADMIN_SCOPE = {
  base: '/admin',
  api: '/admin/posts',
  eyebrow: 'Admin',
  heading: 'Posts',
  canFeature: true,
  canNotify: true,
  showAuthors: true,
};

export const WRITER_SCOPE = {
  base: '/write',
  api: '/write/posts',
  eyebrow: 'Writing desk',
  heading: 'My posts',
  canFeature: false,
  canNotify: false,
  showAuthors: false,
};

export const PostScope = createContext(ADMIN_SCOPE);
export const usePostScope = () => useContext(PostScope);
