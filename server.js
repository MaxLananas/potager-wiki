const express = require('express');
const cors = require('cors');
const axios = require('axios');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

// Configuration de Firebase Admin avec vos informations d'identification
const serviceAccount = {
  "type": "service_account",
  "project_id": "potager-ccacd",
  "private_key_id": "97be50880571d20b74128a122d912d75f5773a40",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDHh0EXXIvfE2vZ\ntUYyNcF/Ogxh9ccBapDQUPvVUQIkSdho1By+hQGoFyiuvDaTnUxfkhT393n6I9lP\n2lCeoHjnJcMdgOx6B0oL4nB8MQoGN6qYfPqloUcdCJX3uYpKZDAEBT9G46BARmCo\nTOaTGVmFE6wGWLwpkRJZPo0QuW/M4UiKHq1YJqz9Rxcv1c9uUL3Oo+d4G+d+0Lyi\nebBK+kAhzoWIEDWjiNipZ4/UEufKPk+1pwXsh1Z2BxEvszCmNL+ll6ZGyzKoYsaY\nGc7UCoWR3k69STCBLWSsqtGCjaVZERBw1+so/zl1azcIGM6ZoRz+7GN08PypclxE\nvh0hTNpZAgMBAAECggEABqt2CNCiaVTWHlsxq0SCQR1A5DZpzlmQWTJX1L/mPS3N\nwuVSR6kdDtAlXz/x6BnSP4Cb3FUkufCgV0vCNadCG2H3BYG1hfe/6SlK3s/p2J7c\nQEgvPcGoJaePkc4dOhLiywOc46MAzJ09pmqZq5GlnS306mplcdNEZIDTiNtWCihv\nmWvTSs7bsjLYdJ/nlY5/xAVabUusufsEwFCxnz4Tw4QmPFraLY0c0AMENFi/znn1\nWssJp44625QpYG/f3iJGDJ2uArj8A9RmStwJU8eUi4wqWLdVgOtFGnVsed0KTJNc\naCnleJkDf1pkoSqKD8V6cm68q6cCw4N7UICv0YhFAQKBgQDuYEN8KOlBIMoCSwdK\nBamm6DC24zpRjYtYeJpupwCsKKyd30CQvKchmjncU27N35+qHbjN984fpD9V9v6N\neYH78k3lFMIm92MLHN7C0DTmfVA6mF5Ca6uxpJMM/9dtBj3l1O57hOyor7aQdSIv\n9/pbWGvfockvwZwQr2Ka37GmgQKBgQDWR7ix6fTiFSiMWiy2BmWr409otoYG+0NC\nwzE1UdxsBu51lErzlfR0/hRKBxaK8oFz7hCyaLct5wQuBR0v3fNkn13luVqcpHnr\nTZ5pBhg/zKKoVIPWmIcK96vrCgcm/HrEiIl0Bg6jxtuYOSP9vooDiaz+091YKice\n2+iS2nE32QKBgQDMfM/nhsDyGcqxROOv4EO05qJDgZHZu+65qlvwaFrvVMUfeRDO\nGMfWz5KrKvd2rEsvh+es6NNt2VxrxkJ/4qhbFXU0+yXCf537Pnzp6eo3f3B/k43o\ntKzI60EqeZ637A7VRmB+nXzXCEU4jwMQ201tZuDDKuqHiTL0LUANU6/2AQKBgQCY\n+MavrHe31qcF23JD2DlJBpOwC22PGl0gEjzU9cXIEQK3SdBgKNNFmgVd+8VqGEm2\nO2QMGZl72YowWFJH08loMiVUVIiNfxXSl6zZCRLSqQIN7ZfY4Ta266z9tED64g+6\nskZ+X7yfyt0FxPUetqHMeMLZgOJpiF45N4DHJc7hsQKBgQDi2uffFCXmdE1Ztw/Z\nO+gs0eawMVgpxVyFtqcer+d61GFe0E75JM4wh369bou0H1elUvNk67M5rB5rsUDf\nIQF/jW5cZUoFH48qy4PQPDbd6n/NkFPQihbCjDk18/qwt/VJxwIm9oOUj9dSFgqA\niabG7NfQBb02XH9n9JKrckSJEw==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@potager-ccacd.iam.gserviceaccount.com",
  "client_id": "114711055814507620195",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40potager-ccacd.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "potager-ccacd.firebasestorage.app"
});

const db = admin.firestore();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'potager-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Mettre à true en production avec HTTPS
}));

// Configuration Discord OAuth
const DISCORD_CLIENT_ID = '1376252920370167849';
const DISCORD_CLIENT_SECRET = '558WNq85hBfmbaeb-bODqGFH3p1vxXYA';
const REDIRECT_URI = 'http://localhost:5000/auth/discord/callback';

// Route d'authentification Discord
app.get('/auth/discord', (req, res) => {
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20email`;
  res.redirect(discordAuthUrl);
});

// Callback d'authentification Discord
app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // 1. Échanger le code contre un token
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        scope: 'identify email',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // 2. Obtenir les infos utilisateur
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        authorization: `Bearer ${access_token}`,
      },
    });

    const { id, username, avatar, email, discriminator } = userResponse.data;
    
    // Construire l'URL de l'avatar Discord
    const avatarUrl = avatar 
      ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128` 
      : 'https://cdn.discordapp.com/embed/avatars/0.png';
    
    // Créer un UID unique pour l'utilisateur Discord
    const uid = `discord:${id}`;
    
    // 3. Créer un token personnalisé Firebase
    const customToken = await admin.auth().createCustomToken(uid);

    // 4. Stocker des infos supplémentaires dans Firestore
    await db.collection('users').doc(uid).set({
      discordId: id,
      username,
      email,
      avatarUrl,
      discriminator,
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 5. Rediriger avec le token et les informations utilisateur
    return res.redirect(`/?token=${customToken}&username=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatarUrl)}&uid=${encodeURIComponent(uid)}`);
  } catch (error) {
    console.error('Erreur d\'authentification Discord:', error.message);
    if (error.response) {
      console.error('Réponse Discord:', error.response.data);
    }
    return res.redirect('/?error=auth_failed');
  }
});

// API pour récupérer les informations utilisateur
app.get('/api/user/:uid', async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.uid).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json(doc.data());
  } catch (error) {
    console.error('Erreur lors de la récupération des informations utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour récupérer les articles
app.get('/api/articles', async (req, res) => {
  try {
    let articlesRef = db.collection('articles');
    
    // Filtrer par catégorie si spécifié
    if (req.query.category && req.query.category !== 'all') {
      articlesRef = articlesRef.where('category', '==', req.query.category);
    }
    
    // Recherche de texte
    if (req.query.q) {
      // Note: Firestore n'a pas de recherche plein texte intégrée
      // On récupère tous les documents et on filtre côté serveur
      const snapshot = await articlesRef.get();
      const articles = [];
      const query = req.query.q.toLowerCase();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (
          data.title.toLowerCase().includes(query) ||
          data.content.toLowerCase().includes(query) ||
          data.authorName.toLowerCase().includes(query)
        ) {
          articles.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      return res.json(articles);
    }
    
    // Tri par date décroissante
    const snapshot = await articlesRef
      .orderBy('createdAt', 'desc')
      .limit(12)
      .get();
    
    const articles = [];
    snapshot.forEach(doc => {
      articles.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(articles);
  } catch (error) {
    console.error('Erreur lors de la récupération des articles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des articles' });
  }
});

// API pour récupérer un article spécifique
app.get('/api/articles/:id', async (req, res) => {
  try {
    const doc = await db.collection('articles').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }
    
    res.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'article:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'article' });
  }
});

// API pour créer un article
app.post('/api/articles', async (req, res) => {
  try {
    const { title, category, content, authorId, authorName, authorAvatar, image } = req.body;
    
    const articleData = {
      title,
      category,
      content,
      authorId,
      authorName,
      authorAvatar: authorAvatar || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (image) {
      articleData.image = image;
    }
    
    const docRef = await db.collection('articles').add(articleData);
    
    res.status(201).json({
      id: docRef.id,
      ...articleData
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'article:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'article' });
  }
});

// API pour mettre à jour un article
app.put('/api/articles/:id', async (req, res) => {
  try {
    const { title, category, content, image } = req.body;
    
    const articleData = {
      title,
      category,
      content,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (image) {
      articleData.image = image;
    }
    
    await db.collection('articles').doc(req.params.id).update(articleData);
    
    res.json({ id: req.params.id, ...articleData });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'article:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'article' });
  }
});

// API pour supprimer un article
app.delete('/api/articles/:id', async (req, res) => {
  try {
    await db.collection('articles').doc(req.params.id).delete();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'article:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'article' });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Interface web disponible sur http://localhost:${PORT}`);
});