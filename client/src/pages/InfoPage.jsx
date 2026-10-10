import Seo from '../components/Seo.jsx';
import InfoContent from '../components/InfoContent.js';
import { publicPages } from '../../../shared/pages.js';

export default function InfoPage({ path }) {
  const page = publicPages[path];
  return <><Seo title={page.title} description={page.description} path={path} /><InfoContent path={path} /></>;
}
