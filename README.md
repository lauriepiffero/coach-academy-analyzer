# Coach Academy — Analyseur de Séances de Coaching

Application web qui permet à tes élèves d'analyser automatiquement leurs séances de coaching selon la grille des 14 critères de la méthode COACH.

## Comment ça marche

1. Ton élève arrive sur le site, entre le code d'accès que tu lui as donné
2. Il colle la transcription de sa séance
3. L'IA analyse la séance en temps réel selon la grille COACH
4. Il reçoit un feedback détaillé avec score, points forts, axes d'amélioration, etc.

## Déploiement sur Vercel (étape par étape)

### Étape 1 — Prérequis

- Un compte GitHub (tu l'as déjà ✅)
- Un compte Vercel connecté à GitHub (tu l'as déjà ✅)
- Une clé API Anthropic (tu l'as déjà ✅)

### Étape 2 — Créer le repo GitHub

1. Va sur https://github.com/new
2. Nom du repo : `coach-academy-analyzer`
3. Laisse en "Private" (important, ton prompt est dedans)
4. Clique "Create repository"
5. Upload tous les fichiers de ce dossier dans le repo
   - Tu peux le faire directement depuis l'interface GitHub : "uploading an existing file"
   - Ou via git en ligne de commande si tu es à l'aise

### Étape 3 — Déployer sur Vercel

1. Va sur https://vercel.com/new
2. Connecte ton repo GitHub `coach-academy-analyzer`
3. Vercel va détecter automatiquement que c'est un projet Next.js
4. **IMPORTANT** — Avant de cliquer "Deploy", ajoute les variables d'environnement :
   - Clique "Environment Variables"
   - Ajoute : `ANTHROPIC_API_KEY` → ta clé API (sk-ant-api03-...)
   - Ajoute : `ACCESS_CODE` → le code que tu veux donner à tes élèves (ex: CoachAcademy2026)
5. Clique "Deploy"
6. Attends 1-2 minutes, c'est en ligne !

### Étape 4 — Partager avec tes élèves

Vercel te donne une URL du type : `https://coach-academy-analyzer.vercel.app`

Donne cette URL + le code d'accès à tes élèves. C'est tout !

## Personnalisation

### Changer le code d'accès
→ Dans Vercel > Settings > Environment Variables > modifie `ACCESS_CODE`

### Modifier le prompt d'analyse
→ Édite le fichier `lib/system-prompt.js` — c'est là que se trouve toute la méthodologie et les instructions d'analyse.

### Modifier le look
→ Édite le fichier `app/globals.css` — les couleurs sont définies en haut du fichier dans les variables CSS.

## Coûts estimés

- **Vercel** : Gratuit (le plan hobby suffit largement)
- **API Anthropic** : ~0.10€ à 0.30€ par analyse de séance
- Pour 20 élèves × 4 analyses/mois = ~20-25€/mois

## Structure du projet

```
coach-academy-analyzer/
├── app/
│   ├── layout.js          # Layout HTML de base
│   ├── page.js            # L'interface utilisateur
│   ├── globals.css        # Les styles (couleurs Coach Academy)
│   └── api/
│       └── analyze/
│           └── route.js   # L'API qui appelle Claude
├── lib/
│   └── system-prompt.js   # TON PROMPT (la méthodologie COACH)
├── package.json
├── next.config.js
├── .env.example           # Exemple des variables d'environnement
├── .gitignore
└── README.md              # Ce fichier
```
