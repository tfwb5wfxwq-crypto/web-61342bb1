# Chantier version anglaise — où on en est

Dernière session : **11 août 2026**.

## En une phrase

Tout le mécanisme bilingue est en place et testé, **mais le sélecteur est
retiré de la production** parce que trois choses n'étaient pas finies. Le site
est en français pour tout le monde, exactement comme avant le chantier.

## Pour réactiver (quand le reste sera fini)

Deux gestes, pas un de plus :

1. Dans `i18n.js`, passer `BILINGUE_ACTIF` à `true` (cherche ce nom, il est en
   bas du fichier, dans le bloc AUTO-INIT).
2. Remettre les deux pilules FR/EN dans les en-têtes de `index.html` et
   `traiteur/index.html`. Leur code exact est récupérable :
   `git show 9c17ed0:index.html | grep -B2 -A5 'lang-switch'`
   (ou n'importe quel commit avant « Retire le selecteur de la production »).

Le CSS `.lang-switch` et la fonction `choisirLangue()` sont **restés en place**,
il n'y a rien à réécrire.

## Ce qui reste à faire avant de réactiver

### 1. Le formulaire de devis traiteur est encore largement en français
C'est le plus gros morceau restant. `traiteur/index.html` : libellés des
champs, options des listes déroulantes, textes de la page. Seuls le statut
d'en-tête, les jours et les trois messages d'envoi sont traduits.

### 2. Vérifier qu'il ne reste aucun texte oublié
Un audit complet était lancé quand la session s'est arrêtée. À relancer.
Points connus à vérifier en priorité, écran par écran :
- la fenêtre de personnalisation d'une Formule
- la fenêtre de choix du créneau horaire
- le formulaire de commande (libellés, `placeholder`)
- la fenêtre de localisation
- les états de `confirmation.html`

### 3. Trancher la question de la détection automatique
Voir la section « Référencement » plus bas. **Rien n'est décidé.**

## Ce qui est FAIT et vérifié

| Quoi | État |
|---|---|
| Dictionnaire `i18n.js` | 236 clés FR et 236 EN, symétriques |
| Messages du panier | fait |
| Validation de commande (8 messages) | fait |
| Tunnel de paiement, cartes restaurant | fait |
| Page de confirmation, les 6 états | fait |
| Statut d'ouverture des 2 pages | fait |
| Menu : 54 plats (`nom_en`, `description_en`) | fait, en base |
| Catégories : 10 (`nom_en`) | fait, en base |
| Emails de commande (5) | déjà bilingues depuis avril |
| Email de devis traiteur | fait, fonction déployée |
| Jours de la semaine, format d'heure | fait (`20h30` → `20:30`) |

## Les pièges à ne jamais oublier

**Le nom du plat est une CLÉ, pas seulement un texte.** Le code s'en sert à
cinq endroits : `FORMULE_CONFIG[item.nom]`, `=== 'Formule 3'`, `=== 'Ayran'`,
et il est recopié dans la commande donc dans les emails, la facture et l'écran
de Paco. La traduction passe UNIQUEMENT par `nomPlat()` et `descPlat()`, à
l'affichage. **Ne jamais traduire `item.nom` dans les données.**
Vérification : en anglais, le panier doit STOCKER « Shawarma Poulet » et
AFFICHER « Chicken Shawarma ».

**Ne jamais poser `data-i18n` sur un élément que le JavaScript réécrit.**
`applyTranslations()` repasse sur tous les éléments balisés et écraserait le
contenu dynamique. Trois cas déjà rencontrés :
- `#timingPickLabel` : contient le créneau CHOISI par le client
- `#formuleTitle` : contient le nom de la formule ouverte
- `#cartPickupDisplay` : contient l'heure de retrait
Un contrôle automatique existe, il croise les `data-i18n` avec les identifiants
réécrits par le JS. Le relancer après chaque ajout de balise.

**Un texte peut servir de repère au code.** Le nettoyage de la roue de
chargement du paiement reconnaissait son bloc au texte « Chargement sécurisé ».
Le traduire aurait laissé la roue par-dessus le formulaire de carte bancaire,
sans aucune erreur visible. Remplacé par un repère technique
`data-pg-spinner`. Chercher ce genre de comparaison avant de traduire.

**Le filet.** Chaque appel s'écrit `T('cle', 'texte français en dur')`. Si le
dictionnaire ne charge pas, si la clé manque, si quoi que ce soit échoue, le
français s'affiche. Vérifié en coupant complètement `i18n.js` : 53 plats
affichés, panier fonctionnel, zéro erreur. **Garder cette règle.**

**Le cache.** `i18n.js` est servi avec 4 heures de cache par Cloudflare alors
que le HTML se met à jour tout de suite. D'où le `?v=<date>` sur son
chargement dans les 3 pages. **À incrémenter à chaque modification du
dictionnaire**, sinon les traductions n'arrivent pas.

## Référencement, et la question de la détection

**Aujourd'hui : aucune détection.** `initLanguage()` ne lit que le choix
explicite du visiteur. `detectBrowserLanguage()` existe mais n'est plus
appelée. Mesuré : un visiteur anglophone, et Googlebot, voient le site en
français, `<html lang="fr">`, titre et description français.

**Le risque si on active la détection.** Le site n'a **qu'une seule adresse**.
Il n'y a pas de `/en/`. Donc pas de `hreflang` possible, et rien à proposer à
Google en échange. Le robot de Google explore en se présentant en anglais :
avec une détection, il verrait le site traduit et pourrait indexer l'anglais
**à la place** du français. Les requêtes qui font vivre le site
(« restaurant libanais la défense », « traiteur libanais la défense ») sont
françaises. C'est un risque réel, pas théorique.

**Les options, si le sujet revient :**
- garder le clic manuel : zéro risque, c'est l'état actuel
- créer de vraies adresses `/en/` avec `hreflang` : le seul moyen propre
  d'avoir la détection sans danger, mais c'est un vrai chantier
- détecter sauf pour les robots : fragile, déconseillé par Google

## Défauts trouvés et corrigés en passant

Ces corrections sont **indépendantes du bilingue** et restent en production :

- **Page traiteur, statut faux.** Elle annonçait « Ouvert · jusqu'à 20h30 »
  pendant la fermeture, en contradiction avec son propre bandeau. Elle ne
  lisait pas `settings.indefinite_pause` : elle ne connaissait que les horaires
  habituels, et la garde de congés n'existait que dans la branche « fermé ».
  Elle lit maintenant le même réglage que l'accueil. Limite assumée : pas de
  mise à jour instantanée ici, le changement est vu au rechargement.

- **Messages d'erreur techniques montrés au client.** `e.message` s'affichait
  tel quel : un client pouvait lire « new row violates row-level security
  policy for table orders ». Corrigé à 4 endroits, avec un message différent
  selon qu'un débit a pu avoir lieu ou non (on ne promet jamais « vous n'avez
  pas été débité » après un paiement possible). Le téléphone du restaurant est
  donné dans chaque cas.

- **Débordement horizontal sur mobile.** Le site débordait **déjà** de 11 px à
  360 px (courant sur Android) et de 51 px à 320 px, à cause de la zone droite
  de l'en-tête, saturée. Le retour à la ligne posé pour le sélecteur corrige ce
  défaut. Vérifié de 1280 à 320 px : plus aucun débordement.

## Base de données

Trois migrations appliquées, **toutes strictement additives** (aucune colonne
modifiée ou supprimée, vérifié après coup) :
- `20260811170000` : `menu_items.nom_en`, `menu_items.description_en`
- `20260811180000` : `quote_requests.language`
- `20260811190000` : `menu_categories.nom_en`

À savoir : deux anciennes migrations (`20260408000000`, `20260511092922`)
n'étaient pas enregistrées comme appliquées alors qu'elles l'étaient. Lues
ligne à ligne avant le push, purement additives, sautées comme prévu.

La CLI Supabase locale n'est pas connectée. Le jeton utilisé vient du Mac
Mini (`ssh mac-mini`, `~/.config/supabase`). `supabase login` est interactif,
donc impossible en autonomie.

## Comment vérifier qu'on n'a rien cassé

Le protocole utilisé à chaque étape, à reprendre :

```
cd /tmp/beyrouth-nonreg && node compare_rendu.mjs
```

Il compare le rendu texte complet du site LOCAL au site EN LIGNE, en
neutralisant ce qui varie (heures, prix, créneaux). Le résultat doit être
**IDENTIQUE**. C'est ce qui a permis d'affirmer, à chaque commit, que le
français affiché n'avait pas bougé d'un caractère.

Autres scripts utiles dans `/tmp/beyrouth-nonreg` : `test_panne.mjs` (coupe
`i18n.js` et vérifie que tout tient), `test_mobile_final.mjs` (débordement de
1280 à 320 px), `test_seo.mjs` (ce que voit Googlebot).
