import { useCarnet } from '@/store/Carnet';

export default function Footer() {
  const { session, setConnexion, deconnexion } = useCarnet();
  return (
    <footer className="bg-vert pt-5 pb-8 text-vert-clair md:pt-[74px] md:pb-12 print:hidden">
      <div className="mx-auto max-w-[1152px] px-5 xl:px-0">
        <div className="flex flex-col gap-4 text-[14px] leading-5 font-medium md:text-[18px] md:leading-[21px] lg:flex-row lg:gap-16">
          <p>
            DA :<br />
            <a href="https://portfolio.agathe.space" target="_blank" rel="noreferrer" className="hover:underline focus-visible:underline">
              Agathe Margely
            </a>
          </p>
          <p>
            Police :<br />
            <a href="https://www.miratmasson.com/" target="_blank" rel="noreferrer" className="hover:underline focus-visible:underline">
              Amiamie par Mirat-Masson
            </a>
          </p>
          <p className="lg:ml-auto">
            Carnet :<br />
            {session ? (
              <button type="button" onClick={deconnexion} className="hover:underline focus-visible:underline">
                Déconnexion
              </button>
            ) : (
              <button type="button" onClick={() => setConnexion(true)} className="hover:underline focus-visible:underline">
                Connexion
              </button>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
