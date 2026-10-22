import { Link } from 'react-router-dom';
import repos from '@/assets/logos/rond_vertclair.svg';
import survol from '@/assets/logos/rond_vert.svg';

// Puce ronde de 25px : vert clair au repos, verte au survol.
export default function Logo() {
  return (
    <Link to="/" rel="home" className="group relative block size-[25px] shrink-0" aria-label="Carnet de recettes — accueil">
      <img src={repos} alt="" width="25" height="25" className="absolute inset-0 size-full transition-opacity duration-300 ease-out-quart group-hover:opacity-0 group-focus-visible:opacity-0" />
      <img src={survol} alt="" width="25" height="25" className="absolute inset-0 size-full opacity-0 transition-opacity duration-300 ease-out-quart group-hover:opacity-100 group-focus-visible:opacity-100" />
    </Link>
  );
}
