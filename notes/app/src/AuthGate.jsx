export default function AuthGate() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-editor-bg text-text-primary">
      <p>Accès privé.</p>
      <a href="/" className="text-accent underline">
        Se connecter depuis le hub
      </a>
    </div>
  );
}
