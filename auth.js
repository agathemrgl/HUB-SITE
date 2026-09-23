import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Clé "publishable" : faite pour être exposée côté client, protégée par les règles
// d'accès (RLS) côté Supabase, pas par le secret.
const supabase = createClient(
	'https://ngbadmsmgnzopdsromqd.supabase.co',
	'sb_publishable_N8uKDD5t8Fp0uKCaPplTOQ_lG1NrzLU',
);

const loginToggle = document.getElementById('login-toggle');
const loginPanel = document.getElementById('login-panel');
const privateLinks = document.getElementById('private-links');

// Sites privés à révéler une fois connectée. En ajouter ici pour les futurs sites.
const PRIVATE_SITES = [{ href: '/notes/', label: 'Notes' }];

function renderPrivateLinks() {
	privateLinks.innerHTML = PRIVATE_SITES.map(
		(site) => `<a href="${site.href}" target="_blank">${site.label}</a><br/>`,
	).join('');
	privateLinks.hidden = false;
}

function renderLoggedInPanel() {
	loginPanel.innerHTML = '<button type="button" id="logout-button">Déconnexion</button>';
	document.getElementById('logout-button').addEventListener('click', async () => {
		await supabase.auth.signOut();
		privateLinks.hidden = true;
		privateLinks.innerHTML = '';
		renderLoggedOutPanel();
		loginToggle.checked = false;
	});
}

function renderLoggedOutPanel() {
	loginPanel.innerHTML = `
		<form id="login-form">
			<input type="email" name="email" placeholder="Email" autocomplete="email" required>
			<input type="password" name="password" placeholder="Mot de passe" autocomplete="current-password" required>
			<button type="submit">Connecter</button>
			<p class="login-error" id="login-error" hidden></p>
		</form>
	`;
	document.getElementById('login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(event) {
	event.preventDefault();
	const form = event.currentTarget;
	const errorEl = document.getElementById('login-error');
	errorEl.hidden = true;

	const email = form.email.value;
	const password = form.password.value;
	const { error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		errorEl.textContent = 'Connexion impossible.';
		errorEl.hidden = false;
		return;
	}

	renderPrivateLinks();
	renderLoggedInPanel();
	loginToggle.checked = false;
}

async function init() {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (session) {
		renderPrivateLinks();
		renderLoggedInPanel();
	} else {
		document.getElementById('login-form').addEventListener('submit', handleLogin);
	}
}

init();
