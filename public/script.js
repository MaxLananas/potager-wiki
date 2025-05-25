// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBUMJ7mDk_sOUei61uTg_tOBARjLD1KrSs",
    authDomain: "potager-ccacd.firebaseapp.com",
    projectId: "potager-ccacd",
    storageBucket: "potager-ccacd.firebasestorage.app",
    messagingSenderId: "363391116339",
    appId: "1:363391116339:web:8bf9491e1ea79778632f46",
    measurementId: "G-44213J1SKS"
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Variables globales
let currentUser = null;
let currentUserIP = null;
let currentArticleId = null;
let isEditing = false;
let editorBlocks = [];
let editorImageUpload = null;
let activeBlockIndex = -1;

// Éléments DOM
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userProfile = document.getElementById('user-profile');
const userName = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const createArticleContainer = document.getElementById('create-article-container');
const articleEditor = document.getElementById('article-editor');
const articlesList = document.getElementById('articles-list');
const articlesContainer = document.getElementById('articles-container');
const articleView = document.getElementById('article-view');
const articleForm = document.getElementById('article-form');
const editorContent = document.getElementById('editor-content');
const articleContentJSON = document.getElementById('article-content-json');
const cancelEditBtn = document.getElementById('cancel-edit');
const closeEditorBtn = document.getElementById('close-editor');
const editArticleBtn = document.getElementById('edit-article-btn');
const deleteArticleBtn = document.getElementById('delete-article-btn');
const backToListBtn = document.getElementById('back-to-list');
const searchInput = document.getElementById('search-input');
const loadingOverlay = document.getElementById('loading-overlay');
const notification = document.getElementById('notification');
const notificationTitle = document.getElementById('notification-title');
const notificationMessage = document.getElementById('notification-message');
const notificationClose = document.querySelector('.notification-close');
const imageUploadModal = document.getElementById('image-upload-modal');
const closeModalBtn = document.getElementById('close-modal');
const imageFileInput = document.getElementById('image-file');
const imagePreview = document.getElementById('image-preview');
const insertImageBtn = document.getElementById('insert-image');
const cancelImageBtn = document.getElementById('cancel-image');
const linkModal = document.getElementById('link-modal');
const closeLinkModalBtn = document.getElementById('close-link-modal');
const linkTextInput = document.getElementById('link-text');
const linkUrlInput = document.getElementById('link-url');
const insertLinkBtn = document.getElementById('insert-link');
const cancelLinkBtn = document.getElementById('cancel-link');
const coverImageInput = document.getElementById('article-cover-image');
const coverImagePreview = document.getElementById('cover-image-preview');
const sourcesContainer = document.getElementById('sources-container');
const addSourceBtn = document.getElementById('add-source-btn');
const toolbarButtons = document.querySelectorAll('.toolbar-btn');

// Obtenir l'adresse IP utilisateur
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        currentUserIP = data.ip;
        console.log('IP utilisateur détectée:', currentUserIP);
        
        // Vérifier si cette IP est associée à un utilisateur connu
        if (currentUserIP) {
            checkIPforAutoLogin();
        }
    } catch (error) {
        console.error('Impossible de récupérer l\'IP:', error);
    }
}

// Vérifier si l'IP est associée à un utilisateur pour connexion auto
async function checkIPforAutoLogin() {
    if (!currentUser && currentUserIP) {
        try {
            const snapshot = await db.collection('user_ips')
                .where('ip', '==', currentUserIP)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const userIPDoc = snapshot.docs[0].data();
                if (userIPDoc.uid) {
                    // Tentative de connexion automatique
                    try {
                        // Cette partie nécessiterait un système de token de session côté serveur
                        // pour être vraiment sécurisée, mais pour la démo, on pourrait simuler:
                        console.log('Connexion automatique tentée pour:', userIPDoc.uid);
                        showNotification('info', 'Connexion', 'Reconnexion automatique en cours...');
                    } catch (error) {
                        console.error('Échec de la connexion automatique:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification IP:', error);
        }
    }
}

// Associer l'IP à l'utilisateur connecté
async function associateIPWithUser(uid) {
    if (!currentUserIP || !uid) return;
    
    try {
        await db.collection('user_ips').doc(uid).set({
            ip: currentUserIP,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('IP associée avec succès à l\'utilisateur');
    } catch (error) {
        console.error('Erreur lors de l\'association IP-utilisateur:', error);
    }
}

// Délai minimum avant que le chargement puisse se terminer
let loadingStartTime = 0;
const MIN_LOADING_TIME = 300; // ms, durée minimale d'affichage du chargement

function showLoading() {
    loadingStartTime = Date.now();
    loadingOverlay.classList.remove('hidden');
    // Appliquer directement la classe active sans délai
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    const elapsedTime = Date.now() - loadingStartTime;
    
    // Si moins de MIN_LOADING_TIME ms se sont écoulées, attendre la différence
    if (elapsedTime < MIN_LOADING_TIME) {
        setTimeout(() => {
            loadingOverlay.classList.remove('active');
            loadingOverlay.classList.add('hidden');
        }, MIN_LOADING_TIME - elapsedTime);
    } else {
        // Sinon, cacher immédiatement
        loadingOverlay.classList.remove('active');
        loadingOverlay.classList.add('hidden');
    }
}

// Variable pour stocker le timeout de notification
let notificationTimeout;

function showNotification(type, title, message) {
    // Annuler le timeout précédent si existant
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    
    notification.className = 'notification';
    notification.classList.add(type);
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    if (type === 'success') {
        notification.querySelector('.notification-icon i').className = 'fas fa-check-circle';
    } else if (type === 'error') {
        notification.querySelector('.notification-icon i').className = 'fas fa-exclamation-circle';
    } else if (type === 'info') {
        notification.querySelector('.notification-icon i').className = 'fas fa-info-circle';
    }
    
    // Afficher immédiatement
    notification.classList.add('show');
    
    // Réduire le temps d'affichage à 3 secondes
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function resetView() {
    articleEditor.classList.add('hidden');
    articleView.classList.add('hidden');
    articlesList.classList.remove('hidden');
}

function openModal(modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Mettre à jour l'interface selon que l'utilisateur est connecté ou non
function updateUIForAuthState(user) {
    if (user) {
        // Afficher le profil utilisateur
        loginBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        
        // Afficher le bouton de création d'article
        createArticleContainer.innerHTML = `
            <button id="create-article-btn" class="create-btn">
                <i class="fas fa-plus"></i> Créer un article
            </button>
        `;
        
        // Ajouter l'événement au bouton
        document.getElementById('create-article-btn').addEventListener('click', showArticleEditor);
    } else {
        // Afficher le bouton de connexion
        loginBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
        
        // Afficher l'invitation à se connecter
        createArticleContainer.innerHTML = `
            <div class="login-invite">
                <p>Vous souhaitez contribuer au wiki?</p>
                <button id="login-invite-btn" class="login-invite-btn">
                    <i class="fab fa-discord"></i>
                    Se connecter
                </button>
            </div>
        `;
        
        // Ajouter l'événement au bouton d'invitation
        document.getElementById('login-invite-btn').addEventListener('click', () => {
            // Utiliser l'URL fournie pour l'authentification Discord
            window.location.href = 'https://discord.com/oauth2/authorize?client_id=1376252920370167849&response_type=code&redirect_uri=https%3A%2F%2Fpotager-wiki.pages.dev%2Fpublic%2F&scope=identify+email';
        });
    }
}

// Afficher l'éditeur d'article
function showArticleEditor() {
    if (!currentUser) {
        showNotification('error', 'Accès refusé', "Vous devez être connecté pour créer un article.");
        return;
    }
    
    // Réinitialiser le formulaire
    articleForm.reset();
    editorContent.innerHTML = '';
    editorBlocks = [];
    isEditing = false;
    currentArticleId = null;
    
    // Ajouter un bloc de paragraphe par défaut
    addEditorBlock('paragraph');
    
    // Changer le titre
    articleEditor.querySelector('h3').innerHTML = '<i class="fas fa-edit"></i> Créer un nouvel article';
    
    // Afficher l'éditeur
    articlesList.classList.add('hidden');
    articleView.classList.add('hidden');
    articleEditor.classList.remove('hidden');
    
    // Animation GSAP
    gsap.fromTo("#article-editor", 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );
}

// Gestion de l'éditeur avancé
function setupAdvancedEditor() {
    // Gestionnaires d'événements pour les boutons de la barre d'outils
    toolbarButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            handleEditorAction(action);
        });
    });
    
    // Gestion de l'upload d'image de couverture
    coverImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                coverImagePreview.innerHTML = `
                    <div class="image-preview">
                        <img src="${e.target.result}" alt="Image de couverture">
                        <button type="button" class="remove-image" id="remove-cover-image">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                coverImagePreview.classList.remove('hidden');
                
                // Gestionnaire pour supprimer l'image
                document.getElementById('remove-cover-image').addEventListener('click', () => {
                    coverImageInput.value = '';
                    coverImagePreview.innerHTML = '';
                    coverImagePreview.classList.add('hidden');
                });
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Gestion de l'upload d'image dans le contenu
    imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.innerHTML = `
                    <img src="${e.target.result}" alt="Aperçu de l'image">
                `;
                imagePreview.classList.remove('hidden');
                editorImageUpload = file;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Insérer une image
    insertImageBtn.addEventListener('click', async () => {
        if (editorImageUpload) {
            showLoading();
            
            try {
                const imageAlt = document.getElementById('image-alt').value || 'Image';
                const imageCaption = document.getElementById('image-caption').value || '';
                
                // Upload de l'image vers Firebase Storage
                const storageRef = storage.ref();
                const fileExtension = editorImageUpload.name.split('.').pop();
                const fileName = `articles/images/${Date.now()}.${fileExtension}`;
                const fileRef = storageRef.child(fileName);
                
                await fileRef.put(editorImageUpload);
                const imageUrl = await fileRef.getDownloadURL();
                
                // Ajouter le bloc d'image
                addEditorBlock('image', {
                    url: imageUrl,
                    alt: imageAlt,
                    caption: imageCaption
                });
                
                // Réinitialiser et fermer le modal
                imageFileInput.value = '';
                imagePreview.innerHTML = '';
                imagePreview.classList.add('hidden');
                document.getElementById('image-alt').value = '';
                document.getElementById('image-caption').value = '';
                editorImageUpload = null;
                closeModal(imageUploadModal);
                
                hideLoading();
            } catch (error) {
                hideLoading();
                console.error('Erreur lors de l\'upload de l\'image:', error);
                showNotification('error', 'Erreur', 'Impossible de télécharger l\'image. Veuillez réessayer.');
            }
        } else {
            showNotification('error', 'Erreur', 'Veuillez sélectionner une image.');
        }
    });
    
    // Annuler l'insertion d'image
    cancelImageBtn.addEventListener('click', () => {
        imageFileInput.value = '';
        imagePreview.innerHTML = '';
        imagePreview.classList.add('hidden');
        document.getElementById('image-alt').value = '';
        document.getElementById('image-caption').value = '';
        editorImageUpload = null;
        closeModal(imageUploadModal);
    });
    
    // Fermer le modal d'image
    closeModalBtn.addEventListener('click', () => {
        closeModal(imageUploadModal);
    });
    
    // Insérer un lien
    insertLinkBtn.addEventListener('click', () => {
        const text = linkTextInput.value.trim();
        const url = linkUrlInput.value.trim();
        
        if (text && url) {
            addEditorBlock('link', { text, url });
            
            // Réinitialiser et fermer le modal
            linkTextInput.value = '';
            linkUrlInput.value = '';
            closeModal(linkModal);
        } else {
            showNotification('error', 'Erreur', 'Veuillez remplir tous les champs.');
        }
    });
    
    // Annuler l'insertion de lien
    cancelLinkBtn.addEventListener('click', () => {
        linkTextInput.value = '';
        linkUrlInput.value = '';
        closeModal(linkModal);
    });
    
    // Fermer le modal de lien
    closeLinkModalBtn.addEventListener('click', () => {
        closeModal(linkModal);
    });
    
    // Ajouter une source
    addSourceBtn.addEventListener('click', () => {
        addSourceField();
    });
}

// Gérer les actions de l'éditeur
function handleEditorAction(action) {
    switch (action) {
        case 'heading':
            addEditorBlock('heading');
            break;
        case 'subheading':
            addEditorBlock('subheading');
            break;
        case 'paragraph':
            addEditorBlock('paragraph');
            break;
        case 'image':
            openModal(imageUploadModal);
            break;
        case 'list':
            addEditorBlock('list');
            break;
        case 'link':
            openModal(linkModal);
            break;
        case 'code':
            addEditorBlock('code');
            break;
        case 'quote':
            addEditorBlock('quote');
            break;
    }
}

// Ajouter un bloc à l'éditeur
function addEditorBlock(type, data = {}) {
    const blockIndex = editorBlocks.length;
    const blockId = `block-${Date.now()}-${blockIndex}`;
    let blockHTML = '';
    
    switch (type) {
        case 'heading':
            blockHTML = `
                <div class="content-block block-heading" data-type="heading" data-block-id="${blockId}">
                    <input type="text" placeholder="Titre principal..." value="${data.text || ''}">
                    <div class="block-actions">
                        <button type="button" class="move-block-up" data-index="${blockIndex}"><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="move-block-down" data-index="${blockIndex}"><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="delete-block" data-index="${blockIndex}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            break;
        case 'subheading':
            blockHTML = `
                <div class="content-block block-subheading" data-type="subheading" data-block-id="${blockId}">
                    <input type="text" placeholder="Sous-titre..." value="${data.text || ''}">
                    <div class="block-actions">
                        <button type="button" class="move-block-up" data-index="${blockIndex}"><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="move-block-down" data-index="${blockIndex}"><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="delete-block" data-index="${blockIndex}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            break;
        case 'paragraph':
            blockHTML = `
                <div class="content-block block-paragraph" data-type="paragraph" data-block-id="${blockId}">
                    <textarea placeholder="Écrivez votre texte ici...">${data.text || ''}</textarea>
                    <div class="block-actions">
                        <button type="button" class="move-block-up" data-index="${blockIndex}"><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="move-block-down" data-index="${blockIndex}"><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="delete-block" data-index="${blockIndex}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            break;
        case 'image':
            blockHTML = `
                <div class="content-block block-image" data-type="image" data-block-id="${blockId}">
                    <figure>
                        <img src="${data.url}" alt="${data.alt || 'Image'}">
                        <figcaption>${data.caption || ''}</figcaption>
                    </figure>
                    <div class="block-actions">
                        <button type="button" class="move-block-up" data-index="${blockIndex}"><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="move-block-down" data-index="${blockIndex}"><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="delete-block" data-index="${blockIndex}"><i class="fas fa-trash"></i></button>
                    </div>
                    <input type="hidden" class="image-url" value="${data.url}">
                    <input type="hidden" class="image-alt" value="${data.alt || 'Image'}">
                    <input type="hidden" class="image-caption" value="${data.caption || ''}">
                </div>
            `;
            break;
        case 'list':
            blockHTML = `
                <div class="content-block block-list" data-type="list" data-block-id="${blockId}">
                    <textarea placeholder="Élément 1&#10;Élément 2&#10;Élément 3">${data.text || ''}</textarea>
                    <div class="block-actions">
                        <button type="button" class="move-block-up" data-index="${blockIndex}"><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="move-block-down" data-index="${blockIndex}"><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="delete-block" data-index="${blockIndex}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            break;
        case 'link':
            blockHTML = `
                <div class="content-block block-link" data-type="link" data-block-id="${blockId}">
                    <i class="fas fa-link"></i>
                    <a href="${data.url}" target="_blank">${data.text}</a>
                    <div class="block-actions">
                        <button type="button" class="move-block-up" data-index="${blockIndex}"><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="move-block-down" data-index="${blockIndex}"><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="delete-block" data-index="${blockIndex}"><i class="fas fa-trash"></i></button>
                    </div>
                    <input type="hidden" class="link-text" value="${data.text}">
                    <input type="hidden" class="link-url" value="${data.url}">
                </div>
            `;
            break;
        case 'code':
            blockHTML = `
                <div class="content-block block-code" data-type="code" data-block-id="${blockId}">
                    <textarea placeholder="Votre code ici...">${data.text || ''}</textarea>
                    <div class="block-actions">
                        <button type="button" class="move-block-up" data-index="${blockIndex}"><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="move-block-down" data-index="${blockIndex}"><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="delete-block" data-index="${blockIndex}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            break;
        case 'quote':
            blockHTML = `
                <div class="content-block block-quote" data-type="quote" data-block-id="${blockId}">
                    <textarea placeholder="Votre citation ici...">${data.text || ''}</textarea>
                    <div class="block-actions">
                        <button type="button" class="move-block-up" data-index="${blockIndex}"><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="move-block-down" data-index="${blockIndex}"><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="delete-block" data-index="${blockIndex}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            break;
    }
    
    editorBlocks.push({
        type,
        id: blockId,
        ...data
    });
    
    // Ajouter le bloc à l'éditeur
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = blockHTML;
    const blockElement = tempDiv.firstElementChild;
    editorContent.appendChild(blockElement);
    
    // Ajouter les gestionnaires d'événements pour les actions du bloc
    const moveUpButtons = blockElement.querySelectorAll('.move-block-up');
    const moveDownButtons = blockElement.querySelectorAll('.move-block-down');
    const deleteButtons = blockElement.querySelectorAll('.delete-block');
    
    moveUpButtons.forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'));
            moveEditorBlock(index, 'up');
        });
    });
    
    moveDownButtons.forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'));
            moveEditorBlock(index, 'down');
        });
    });
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'));
            deleteEditorBlock(index);
        });
    });
    
    // Focus sur le nouveau bloc
    const inputElement = blockElement.querySelector('input') || blockElement.querySelector('textarea');
    if (inputElement) {
        inputElement.focus();
    }
    
    // Mettre à jour les indices
    updateBlockIndices();
}

// Mettre à jour les indices des blocs
function updateBlockIndices() {
    const blocks = editorContent.querySelectorAll('.content-block');
    blocks.forEach((block, index) => {
        const upButtons = block.querySelectorAll('.move-block-up');
        const downButtons = block.querySelectorAll('.move-block-down');
        const deleteButtons = block.querySelectorAll('.delete-block');
        
        upButtons.forEach(button => button.setAttribute('data-index', index));
        downButtons.forEach(button => button.setAttribute('data-index', index));
        deleteButtons.forEach(button => button.setAttribute('data-index', index));
        
        // Mettre à jour l'indice dans editorBlocks
        editorBlocks[index].index = index;
    });
}

// Déplacer un bloc vers le haut ou le bas
function moveEditorBlock(index, direction) {
    if (direction === 'up' && index > 0) {
        // Échanger avec le bloc précédent
        const temp = editorBlocks[index];
        editorBlocks[index] = editorBlocks[index - 1];
        editorBlocks[index - 1] = temp;
        
        // Mettre à jour le DOM
        const blocks = Array.from(editorContent.querySelectorAll('.content-block'));
        const block = blocks[index];
        const prevBlock = blocks[index - 1];
        
        editorContent.insertBefore(block, prevBlock);
        
        // Animation
        gsap.from(block, {
            y: -20,
            opacity: 0.5,
            duration: 0.3,
            ease: "power2.out"
        });
    } else if (direction === 'down' && index < editorBlocks.length - 1) {
        // Échanger avec le bloc suivant
        const temp = editorBlocks[index];
        editorBlocks[index] = editorBlocks[index + 1];
        editorBlocks[index + 1] = temp;
        
        // Mettre à jour le DOM
        const blocks = Array.from(editorContent.querySelectorAll('.content-block'));
        const block = blocks[index];
        const nextBlock = blocks[index + 1];
        
        if (nextBlock.nextSibling) {
            editorContent.insertBefore(block, nextBlock.nextSibling);
        } else {
            editorContent.appendChild(block);
        }
        
        // Animation
        gsap.from(block, {
            y: 20,
            opacity: 0.5,
            duration: 0.3,
            ease: "power2.out"
        });
    }
    
    // Mettre à jour les indices
    updateBlockIndices();
}

// Supprimer un bloc
function deleteEditorBlock(index) {
    // Supprimer du tableau
    editorBlocks.splice(index, 1);
    
    // Supprimer du DOM
    const blocks = Array.from(editorContent.querySelectorAll('.content-block'));
    const block = blocks[index];
    
    gsap.to(block, {
        height: 0,
        opacity: 0,
        padding: 0,
        margin: 0,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
            editorContent.removeChild(block);
            updateBlockIndices();
        }
    });
}

// Récupérer le contenu de l'éditeur
function getEditorContent() {
    const blocks = editorContent.querySelectorAll('.content-block');
    const content = [];
    
    blocks.forEach(block => {
        const type = block.getAttribute('data-type');
        const blockId = block.getAttribute('data-block-id');
        
        let blockData = { type, id: blockId };
        
        switch (type) {
            case 'heading':
            case 'subheading':
                blockData.text = block.querySelector('input').value;
                break;
            case 'paragraph':
            case 'list':
            case 'code':
            case 'quote':
                blockData.text = block.querySelector('textarea').value;
                break;
            case 'image':
                blockData.url = block.querySelector('.image-url').value;
                blockData.alt = block.querySelector('.image-alt').value;
                blockData.caption = block.querySelector('.image-caption').value;
                break;
            case 'link':
                blockData.text = block.querySelector('.link-text').value;
                blockData.url = block.querySelector('.link-url').value;
                break;
        }
        
        content.push(blockData);
    });
    
    return content;
}

// Ajouter un champ de source
function addSourceField() {
    const sourceItem = document.createElement('div');
    sourceItem.className = 'source-item';
    sourceItem.innerHTML = `
        <input type="text" class="source-input" placeholder="Titre de la source">
        <input type="url" class="source-url" placeholder="URL de la source">
        <button type="button" class="remove-source-btn"><i class="fas fa-times"></i></button>
    `;
    
    sourcesContainer.appendChild(sourceItem);
    
    // Ajouter le gestionnaire d'événement pour supprimer
    sourceItem.querySelector('.remove-source-btn').addEventListener('click', () => {
        gsap.to(sourceItem, {
            height: 0,
            opacity: 0,
            padding: 0,
            margin: 0,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => {
                sourcesContainer.removeChild(sourceItem);
            }
        });
    });
    
    // Animation
    gsap.from(sourceItem, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.out"
    });
}

// Récupérer les sources
function getSources() {
    const sourceItems = sourcesContainer.querySelectorAll('.source-item');
    const sources = [];
    
    sourceItems.forEach(item => {
        const title = item.querySelector('.source-input').value.trim();
        const url = item.querySelector('.source-url').value.trim();
        
        if (title || url) {
            sources.push({ title, url });
        }
    });
    
    return sources;
}

// Remplir l'éditeur avec le contenu existant
function populateEditor(content, sources) {
    // Vider l'éditeur
    editorContent.innerHTML = '';
    editorBlocks = [];
    
    // Ajouter les blocs de contenu
    if (content && Array.isArray(content)) {
        content.forEach(block => {
            addEditorBlock(block.type, block);
        });
    }
    
    // Vider les sources
    sourcesContainer.innerHTML = '';
    
    // Ajouter les sources
    if (sources && Array.isArray(sources)) {
        sources.forEach(source => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            sourceItem.innerHTML = `
                <input type="text" class="source-input" placeholder="Titre de la source" value="${source.title || ''}">
                <input type="url" class="source-url" placeholder="URL de la source" value="${source.url || ''}">
                <button type="button" class="remove-source-btn"><i class="fas fa-times"></i></button>
            `;
            
            sourcesContainer.appendChild(sourceItem);
            
            // Ajouter le gestionnaire d'événement pour supprimer
            sourceItem.querySelector('.remove-source-btn').addEventListener('click', () => {
                gsap.to(sourceItem, {
                    height: 0,
                    opacity: 0,
                    padding: 0,
                    margin: 0,
                    duration: 0.3,
                    ease: "power2.out",
                    onComplete: () => {
                        sourcesContainer.removeChild(sourceItem);
                    }
                });
            });
        });
    }
    
    // Ajouter un bloc de paragraphe par défaut si l'éditeur est vide
    if (editorBlocks.length === 0) {
        addEditorBlock('paragraph');
    }
}

// Authentification avec Discord
function setupAuth() {
    loginBtn.addEventListener('click', () => {
        // Utiliser l'URL fournie pour l'authentification Discord
        window.location.href = 'https://discord.com/oauth2/authorize?client_id=1376252920370167849&response_type=code&redirect_uri=https%3A%2F%2Fpotager-wiki.pages.dev%2Fpublic%2F&scope=identify+email';
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            showNotification('success', 'Déconnexion', 'Vous êtes maintenant déconnecté.');
        } catch (error) {
            console.error("Erreur de déconnexion:", error);
            showNotification('error', 'Erreur', 'La déconnexion a échoué.');
        }
    });

    // Vérifier si un token est présent dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const username = urlParams.get('username');
    const avatar = urlParams.get('avatar');
    const uid = urlParams.get('uid');
    const error = urlParams.get('error');
    
    if (token) {
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, '/');
        
        // Se connecter avec le token personnalisé
        showLoading();
        auth.signInWithCustomToken(token)
            .then(() => {
                // Stocker les informations supplémentaires dans sessionStorage
                if (username) sessionStorage.setItem('username', username);
                if (avatar) sessionStorage.setItem('avatar', avatar);
                if (uid) sessionStorage.setItem('uid', uid);
                
                // Associer l'IP à l'utilisateur
                if (uid) associateIPWithUser(uid);
                
                hideLoading();
                showNotification('success', 'Connexion réussie', 'Vous êtes maintenant connecté avec Discord.');
            })
            .catch((error) => {
                hideLoading();
                console.error("Erreur de connexion:", error);
                showNotification('error', 'Erreur', 'La connexion a échoué. Veuillez réessayer.');
            });
    }
    
    if (error) {
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, '/');
        
        if (error === 'auth_failed') {
            showNotification('error', 'Erreur', 'La connexion avec Discord a échoué. Veuillez réessayer.');
        } else if (error === 'no_code') {
            showNotification('error', 'Erreur', 'Connexion annulée ou code manquant.');
        }
    }

    // Écouter les changements d'état d'authentification
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            
            // Récupérer les informations de sessionStorage ou de Firestore
            const storedUsername = sessionStorage.getItem('username');
            const storedAvatar = sessionStorage.getItem('avatar');
            
            if (storedUsername && storedAvatar) {
                // Utiliser les infos stockées
                userName.textContent = storedUsername;
                userAvatar.src = storedAvatar;
                
                // Mettre à jour l'interface
                updateUIForAuthState(user);
                loadArticles();
            } else {
                // Récupérer depuis Firestore
                db.collection('users').doc(user.uid).get()
                    .then(doc => {
                        if (doc.exists) {
                            const userData = doc.data();
                            userName.textContent = userData.username || 'Utilisateur';
                            userAvatar.src = userData.avatarUrl || 'images/default-avatar.png';
                            
                            // Stocker pour une utilisation future
                            sessionStorage.setItem('username', userData.username);
                            sessionStorage.setItem('avatar', userData.avatarUrl);
                        } else {
                            userName.textContent = user.displayName || 'Utilisateur';
                            userAvatar.src = user.photoURL || 'images/default-avatar.png';
                        }
                        
                        // Associer l'IP à l'utilisateur
                        associateIPWithUser(user.uid);
                        
                        // Mettre à jour l'interface
                        updateUIForAuthState(user);
                        loadArticles();
                    })
                    .catch(error => {
                        console.error("Erreur lors de la récupération des données utilisateur:", error);
                        userName.textContent = user.displayName || 'Utilisateur';
                        userAvatar.src = user.photoURL || 'images/default-avatar.png';
                        
                        // Mettre à jour l'interface
                        updateUIForAuthState(user);
                        loadArticles();
                    });
            }
        } else {
            currentUser = null;
            // Nettoyer le stockage de session
            sessionStorage.removeItem('username');
            sessionStorage.removeItem('avatar');
            sessionStorage.removeItem('uid');
            
            // Mettre à jour l'interface
            updateUIForAuthState(null);
            loadArticles();
        }
    });
}

// Gestion des articles
function setupArticles() {
    // Charger tous les articles
    // Charger tous les articles
function loadArticles(category = null) {
    showLoading();
    articlesContainer.innerHTML = '';
    
    // Limite augmentée pour réduire les chargements fréquents
    const ARTICLES_LIMIT = 20;
    
    let query = db.collection('articles').orderBy('createdAt', 'desc');
    
    // Si une catégorie est spécifiée et n'est pas "all"
    if (category && category !== 'all') {
        query = db.collection('articles')
            .where('category', '==', category)
            .orderBy('createdAt', 'desc');
    }
    
    query.limit(ARTICLES_LIMIT).get()
        .then(snapshot => {
            if (snapshot.empty) {
                articlesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-book-open"></i>
                        <p>Aucun article n'a encore été créé. Soyez le premier à contribuer !</p>
                    </div>`;
                hideLoading();
                return;
            }
            
            // Créer tous les éléments avant de les ajouter au DOM
            const fragment = document.createDocumentFragment();
            
            snapshot.forEach(doc => {
                const article = doc.data();
                const articleElement = createArticleCard(doc.id, article);
                fragment.appendChild(articleElement);
            });
            
            // Ajouter tous les éléments en une seule opération DOM
            articlesContainer.appendChild(fragment);
            
            // Animation optimisée - animer par groupes de 5 éléments maximum
            const cards = articlesContainer.querySelectorAll('.article-card');
            const cardGroups = [];
            
            for (let i = 0; i < cards.length; i += 5) {
                cardGroups.push(Array.from(cards).slice(i, i + 5));
            }
            
            cardGroups.forEach((group, index) => {
                gsap.fromTo(group, 
                    { opacity: 0, y: 20 },
                    { 
                        opacity: 1, 
                        y: 0, 
                        duration: 0.3, 
                        stagger: 0.05,
                        delay: index * 0.1,
                        ease: "power2.out",
                        onStart: () => {
                            if (index === 0) hideLoading();
                        }
                    }
                );
            });
            
            if (cards.length === 0) {
                hideLoading();
            }
        })
        .catch(error => {
            console.error("Erreur lors du chargement des articles:", error);
            showNotification('error', 'Erreur', 'Impossible de charger les articles.');
            articlesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erreur lors du chargement des articles. Veuillez rafraîchir la page.</p>
                </div>`;
            hideLoading();
        });
}

    // Créer une carte d'article
    function createArticleCard(id, article) {
        const div = document.createElement('div');
        div.className = 'article-card';
        
        const date = article.createdAt && article.createdAt.toDate ? 
            formatDate(article.createdAt.toDate()) : 
            formatDate(new Date());
            
        div.innerHTML = `
            <div class="article-image">
                <img src="${article.image || 'images/default-article.jpg'}" alt="${article.title}">
                <span class="article-category-tag">${getCategoryLabel(article.category)}</span>
            </div>
            <div class="article-details">
                <h4 class="article-title">${article.title}</h4>
                <p class="article-excerpt">${getArticleExcerpt(article.content)}</p>
                <div class="article-footer">
                    <div class="article-author">
                        <img src="${article.authorAvatar || 'images/default-avatar.png'}" alt="${article.authorName}" class="author-avatar">
                        <span>${article.authorName}</span>
                    </div>
                    <div class="article-date">${date}</div>
                </div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            viewArticle(id);
        });
        
        return div;
    }

    // Obtenir un extrait de l'article
    function getArticleExcerpt(content) {
        if (typeof content === 'string') {
            return content.substring(0, 120) + '...';
        } 
        
        if (Array.isArray(content)) {
            // Chercher le premier bloc de paragraphe
            const paragraphBlock = content.find(block => block.type === 'paragraph');
            if (paragraphBlock && paragraphBlock.text) {
                return paragraphBlock.text.substring(0, 120) + '...';
            }
            
            // Si pas de paragraphe, prendre le premier bloc avec du texte
            const textBlock = content.find(block => block.text);
            if (textBlock && textBlock.text) {
                return textBlock.text.substring(0, 120) + '...';
            }
        }
        
        return 'Cliquez pour lire l\'article...';
    }

    // Obtenir le libellé d'une catégorie
    function getCategoryLabel(categoryId) {
        const categories = {
            'cultures': 'Cultures',
            'constructions': 'Constructions',
            'biomes': 'Biomes',
            'plugins': 'Plugins',
            'communaute': 'Communauté',
            'guides': 'Guides'
        };
        
        return categories[categoryId] || 'Autre';
    }

    // Formater une date
    function formatDate(date) {
        return new Date(date).toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    }

    // Afficher un article
    // Afficher un article
function viewArticle(id) {
    // Vérifier si l'article est déjà affiché
    if (currentArticleId === id && !articleView.classList.contains('hidden')) {
        return; // Éviter le rechargement inutile
    }
    
    showLoading();
    
    db.collection('articles').doc(id).get()
        .then(doc => {
            if (!doc.exists) {
                hideLoading();
                showNotification('error', 'Erreur', "Cet article n'existe pas ou a été supprimé.");
                return;
            }
            
            const article = doc.data();
            currentArticleId = id;
            
            // Préparer tous les éléments avant de modifier le DOM
            document.getElementById('view-title').textContent = article.title;
            document.getElementById('view-author').textContent = article.authorName;
            document.getElementById('view-author-avatar').src = article.authorAvatar || 'images/default-avatar.png';
            document.getElementById('view-date').textContent = formatDate(article.createdAt.toDate ? article.createdAt.toDate() : new Date());
            document.getElementById('view-category').textContent = getCategoryLabel(article.category);
            
            // Remplir le contenu
            const viewContent = document.getElementById('view-content');
            viewContent.innerHTML = '';
            
            // Création d'un fragment pour optimiser les opérations DOM
            const contentFragment = document.createDocumentFragment();
            
            if (typeof article.content === 'string') {
                // Ancien format - simple texte
                const contentDiv = document.createElement('div');
                contentDiv.innerHTML = formatLegacyContent(article.content);
                contentFragment.appendChild(contentDiv);
            } else if (Array.isArray(article.content)) {
                // Nouveau format - blocs
                article.content.forEach(block => {
                    contentFragment.appendChild(renderContentBlock(block));
                });
            }
            
            viewContent.appendChild(contentFragment);
            
            // Afficher les sources s'il y en a
            const viewSources = document.getElementById('view-sources');
            const sourcesList = document.getElementById('sources-list');
            
            if (article.sources && article.sources.length > 0) {
                sourcesList.innerHTML = '';
                
                const sourcesFragment = document.createDocumentFragment();
                
                article.sources.forEach(source => {
                    const li = document.createElement('li');
                    if (source.url) {
                        li.innerHTML = `<a href="${source.url}" target="_blank">${source.title || source.url}</a>`;
                    } else {
                        li.textContent = source.title;
                    }
                    sourcesFragment.appendChild(li);
                });
                
                sourcesList.appendChild(sourcesFragment);
                viewSources.classList.remove('hidden');
            } else {
                viewSources.classList.add('hidden');
            }
            
            // Gérer les boutons d'action
            const canEdit = currentUser && (currentUser.uid === article.authorId || isAdmin(currentUser.uid));
            editArticleBtn.style.display = canEdit ? 'flex' : 'none';
            deleteArticleBtn.style.display = canEdit ? 'flex' : 'none';
            
            // Pré-cacher les vues non utilisées avant d'afficher la vue d'article
            articlesList.classList.add('hidden');
            articleEditor.classList.add('hidden');
            
            // Terminer le chargement avant d'afficher la vue
            hideLoading();
            
            // Afficher la vue d'article
            articleView.classList.remove('hidden');
            
            // Animation simplifiée
            gsap.fromTo("#article-view", 
                { opacity: 0 }, 
                { opacity: 1, duration: 0.3, ease: "power2.out" }
            );
            
            // Scroll en haut avec comportement auto pour plus de rapidité
            window.scrollTo(0, 0);
        })
        .catch(error => {
            hideLoading();
            console.error("Erreur lors du chargement de l'article:", error);
            showNotification('error', 'Erreur', "Impossible de charger l'article.");
        });
}

    // Formater le contenu legacy (ancienne version)
    function formatLegacyContent(content) {
        // Convertir les sauts de ligne en paragraphes
        const paragraphs = content.split('\n\n').map(p => p.trim());
        return paragraphs.map(p => `<p>${p}</p>`).join('');
    }

    // Rendu d'un bloc de contenu
    function renderContentBlock(block) {
        const div = document.createElement('div');
        
        switch (block.type) {
            case 'heading':
                div.innerHTML = `<h2>${block.text}</h2>`;
                break;
            case 'subheading':
                div.innerHTML = `<h3>${block.text}</h3>`;
                break;
            case 'paragraph':
                div.innerHTML = `<p>${block.text}</p>`;
                break;
            case 'image':
                div.innerHTML = `
                    <figure>
                        <img src="${block.url}" alt="${block.alt || 'Image'}">
                        ${block.caption ? `<figcaption>${block.caption}</figcaption>` : ''}
                    </figure>
                `;
                break;
            case 'list':
                const listItems = block.text.split('\n').map(item => item.trim()).filter(item => item);
                const listHTML = listItems.map(item => `<li>${item}</li>`).join('');
                div.innerHTML = `<ul>${listHTML}</ul>`;
                break;
            case 'link':
                div.innerHTML = `<p><a href="${block.url}" target="_blank">${block.text}</a></p>`;
                break;
            case 'code':
                div.innerHTML = `<pre><code>${block.text}</code></pre>`;
                break;
            case 'quote':
                div.innerHTML = `<blockquote>${block.text}</blockquote>`;
                break;
        }
        
        return div.firstElementChild;
    }

    // Vérifier si un utilisateur est admin
    function isAdmin(userId) {
        // À implémenter selon votre logique d'administration
        const adminIds = ['discord:123456789', 'discord:987654321'];
        return adminIds.includes(userId);
    }

    // Éditer un article
    function editArticle(id) {
        showLoading();
        
        db.collection('articles').doc(id).get()
            .then(doc => {
                hideLoading();
                
                if (!doc.exists) {
                    showNotification('error', 'Erreur', "Cet article n'existe pas ou a été supprimé.");
                    return;
                }
                
                const article = doc.data();
                
                // Vérifier les permissions
                if (!currentUser) {
                    showNotification('error', 'Accès refusé', "Vous devez être connecté pour modifier un article.");
                    return;
                }
                
                if (currentUser.uid !== article.authorId && !isAdmin(currentUser.uid)) {
                    showNotification('error', 'Accès refusé', "Vous n'avez pas les droits pour modifier cet article.");
                    return;
                }
                
                // Remplir le formulaire avec les données de l'article
                document.getElementById('article-title').value = article.title || '';
                document.getElementById('article-category').value = article.category || '';
                
                // Afficher l'image de couverture si elle existe
                if (article.image) {
                    coverImagePreview.innerHTML = `
                        <div class="image-preview">
                            <img src="${article.image}" alt="Image de couverture">
                            <button type="button" class="remove-image" id="remove-cover-image">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                    coverImagePreview.classList.remove('hidden');
                    
                    // Gestionnaire pour supprimer l'image
                    document.getElementById('remove-cover-image').addEventListener('click', () => {
                        coverImageInput.value = '';
                        coverImagePreview.innerHTML = '';
                        coverImagePreview.classList.add('hidden');
                    });
                }
                
                // Remplir l'éditeur de contenu
                if (Array.isArray(article.content)) {
                    // Nouveau format - blocs
                    populateEditor(article.content, article.sources);
                } else if (typeof article.content === 'string') {
                    // Ancien format - convertir en blocs
                    const paragraphs = article.content.split('\n\n').map(p => p.trim()).filter(p => p);
                    const blocks = paragraphs.map(p => ({ type: 'paragraph', text: p }));
                    populateEditor(blocks, article.sources);
                } else {
                    // Par défaut, ajouter un bloc de paragraphe vide
                    populateEditor(null, article.sources);
                }
                
                // Passer en mode édition
                isEditing = true;
                currentArticleId = id;
                
                // Afficher l'éditeur
                articleView.classList.add('hidden');
                articlesList.classList.add('hidden');
                articleEditor.classList.remove('hidden');
                
                // Changer le titre
                articleEditor.querySelector('h3').innerHTML = '<i class="fas fa-edit"></i> Modifier l\'article';
                
                // Animation
                gsap.fromTo("#article-editor", 
                    { opacity: 0, y: 20 }, 
                    { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
                );
                
                // Scroll en haut
                window.scrollTo({ top: 0, behavior: 'smooth' });
            })
            .catch(error => {
                hideLoading();
                console.error("Erreur lors de la récupération de l'article à éditer:", error);
                showNotification('error', 'Erreur', "Impossible de charger l'article à modifier.");
            });
    }

    // Supprimer un article
    function deleteArticle(id) {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible.")) {
            return;
        }
        
        showLoading();
        
        db.collection('articles').doc(id).get()
            .then(doc => {
                if (!doc.exists) {
                    hideLoading();
                    showNotification('error', 'Erreur', "Cet article n'existe pas ou a déjà été supprimé.");
                    return;
                }
                
                const article = doc.data();
                
                // Vérifier les permissions
                if (!currentUser) {
                    hideLoading();
                    showNotification('error', 'Accès refusé', "Vous devez être connecté pour supprimer un article.");
                    return;
                }
                
                if (currentUser.uid !== article.authorId && !isAdmin(currentUser.uid)) {
                    hideLoading();
                    showNotification('error', 'Accès refusé', "Vous n'avez pas les droits pour supprimer cet article.");
                    return;
                }
                
                // Supprimer l'article
                return db.collection('articles').doc(id).delete();
            })
            .then(() => {
                hideLoading();
                showNotification('success', 'Supprimé', "L'article a été supprimé avec succès.");
                resetView();
                loadArticles();
            })
            .catch(error => {
                hideLoading();
                console.error("Erreur lors de la suppression de l'article:", error);
                showNotification('error', 'Erreur', "Impossible de supprimer l'article.");
            });
    }

    // Recherche d'articles
    function searchArticles(query) {
        showLoading();
        articlesContainer.innerHTML = '';
        
        if (!query || query.length < 3) {
            loadArticles();
            return;
        }
        
        // Convertir la requête en minuscules pour une recherche insensible à la casse
        const lowerQuery = query.toLowerCase();
        
        db.collection('articles')
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                hideLoading();
                
                // Filtrer les articles qui correspondent à la recherche
                const matchingArticles = [];
                
                snapshot.forEach(doc => {
                    const article = doc.data();
                    const title = article.title.toLowerCase();
                    let content = '';
                    
                    // Extraction du contenu textuel pour la recherche
                    if (typeof article.content === 'string') {
                        content = article.content.toLowerCase();
                    } else if (Array.isArray(article.content)) {
                        content = article.content
                            .filter(block => block.text)
                            .map(block => block.text)
                            .join(' ')
                            .toLowerCase();
                    }
                    
                    const author = article.authorName.toLowerCase();
                    
                    if (title.includes(lowerQuery) || content.includes(lowerQuery) || author.includes(lowerQuery)) {
                        matchingArticles.push({ id: doc.id, ...article });
                    }
                });
                
                if (matchingArticles.length === 0) {
                    articlesContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <p>Aucun résultat trouvé pour "${query}". Essayez avec d'autres termes.</p>
                        </div>`;
                    return;
                }
                
                // Afficher les résultats
                matchingArticles.forEach(article => {
                    const articleElement = createArticleCard(article.id, article);
                    articlesContainer.appendChild(articleElement);
                });
                
                // Animation des résultats
                gsap.fromTo(".article-card", 
                    { opacity: 0, y: 30 },
                    { 
                        opacity: 1, 
                        y: 0, 
                        duration: 0.5, 
                        stagger: 0.1,
                        ease: "power2.out"
                    }
                );
            })
            .catch(error => {
                hideLoading();
                console.error("Erreur lors de la recherche:", error);
                showNotification('error', 'Erreur', "Impossible d'effectuer la recherche.");
            });
    }

    // Événements
    
    // Annuler/fermer l'éditeur
    cancelEditBtn.addEventListener('click', () => {
        if (isEditing) {
            viewArticle(currentArticleId);
        } else {
            resetView();
        }
    });
    
    closeEditorBtn.addEventListener('click', () => {
        if (isEditing) {
            viewArticle(currentArticleId);
        } else {
            resetView();
        }
    });
    
    // Retour à la liste
    backToListBtn.addEventListener('click', () => {
        resetView();
    });
    
    // Modifier un article
    editArticleBtn.addEventListener('click', () => {
        editArticle(currentArticleId);
    });
    
    // Supprimer un article
    deleteArticleBtn.addEventListener('click', () => {
        deleteArticle(currentArticleId);
    });
    
    // Recherche
    searchInput.addEventListener('input', debounce((e) => {
        searchArticles(e.target.value.trim());
    }, 500));
    
    // Soumission du formulaire d'article
    // Soumission du formulaire d'article
articleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('error', 'Accès refusé', "Vous devez être connecté pour publier un article.");
        return;
    }
    
    const title = document.getElementById('article-title').value.trim();
    const category = document.getElementById('article-category').value;
    
    if (!title || !category) {
        showNotification('error', 'Formulaire incomplet', "Veuillez remplir tous les champs obligatoires.");
        return;
    }
    
    // Désactiver le bouton de soumission pour éviter les soumissions multiples
    const submitBtn = articleForm.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement...';
    
    showLoading();
    
    try {
        // Récupérer le contenu de l'éditeur
        const content = getEditorContent();
        
        // Récupérer les sources
        const sources = getSources();
        
        // Données de l'article
        const articleData = {
            title,
            category,
            content,
            sources,
            authorId: currentUser.uid,
            authorName: userName.textContent,
            authorAvatar: userAvatar.src,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Gérer l'image de couverture si elle a été modifiée
        const coverImageFile = coverImageInput.files[0];
        if (coverImageFile) {
            // Upload de l'image vers Firebase Storage
            const storageRef = storage.ref();
            const fileExtension = coverImageFile.name.split('.').pop();
            const fileName = `articles/covers/${Date.now()}.${fileExtension}`;
            const fileRef = storageRef.child(fileName);
            
            await fileRef.put(coverImageFile);
            const imageUrl = await fileRef.getDownloadURL();
            
            articleData.image = imageUrl;
        } else if (coverImagePreview.classList.contains('hidden')) {
            // Si le prévisualisateur est caché et qu'aucun nouveau fichier n'est sélectionné,
            // supprimer l'image de couverture existante
            articleData.image = null;
        }
        
        if (isEditing) {
            // Mettre à jour un article existant
            await db.collection('articles').doc(currentArticleId).update(articleData);
            hideLoading();
            showNotification('success', 'Mis à jour', "L'article a été mis à jour avec succès.");
            
            // Attendre que l'animation de notification commence avant de naviguer
            setTimeout(() => {
                viewArticle(currentArticleId);
            }, 300);
        } else {
            // Créer un nouvel article
            articleData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            const docRef = await db.collection('articles').add(articleData);
            hideLoading();
            showNotification('success', 'Publié', "L'article a été publié avec succès.");
            
            // Attendre que l'animation de notification commence avant de naviguer
            setTimeout(() => {
                viewArticle(docRef.id);
            }, 300);
        }
    } catch (error) {
        hideLoading();
        console.error("Erreur lors de la publication:", error);
        showNotification('error', 'Erreur', "Impossible de publier l'article. Veuillez réessayer.");
        
        // Réactiver le bouton
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Publier l\'article';
    }
});
    
    // Navigation dans les catégories
    document.querySelectorAll('#categories-list a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Mettre à jour la classe active
            document.querySelectorAll('#categories-list a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const category = link.getAttribute('data-category');
            loadArticles(category);
        });
    });
    
    // Fermer la notification
    notificationClose.addEventListener('click', () => {
        notification.classList.remove('show');
    });
    
    // Function pour limiter les appels (debounce)
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    // Retour à l'accueil quand on clique sur le logo
    document.querySelector('.logo').addEventListener('click', () => {
        resetView();
        loadArticles();
    });
    
    // Exposer la fonction loadArticles globalement
    window.loadArticles = loadArticles;
    
    // Charger les articles au démarrage
    return loadArticles;
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Détecter l'IP utilisateur
    getUserIP();
    
    // Configurer l'éditeur avancé
    setupAdvancedEditor();
    
    // Configurer l'authentification
    setupAuth();
    
    // Configurer la gestion des articles
    const loadArticles = setupArticles();
    
    // Mettre à jour l'interface initialement
    updateUIForAuthState(null);
    
    // Animations initiales avec GSAP
    gsap.from(".sidebar", { 
        x: -30, 
        opacity: 0, 
        duration: 0.8, 
        ease: "power2.out" 
    });
    
    gsap.from(".main-header", { 
        y: -20, 
        opacity: 0, 
        duration: 0.5, 
        delay: 0.3,
        ease: "power2.out" 
    });
    
    gsap.from(".welcome-banner", { 
        opacity: 0, 
        scale: 0.95,
        duration: 0.8, 
        delay: 0.5,
        ease: "power3.out" 
    });
    
    gsap.from(".section-header", { 
        opacity: 0, 
        duration: 0.5, 
        delay: 0.7,
        ease: "power2.out" 
    });
    
    // Charger les articles
    loadArticles();

    // Optimisations de performance supplémentaires

// Préchargement des images par défaut
function preloadDefaultImages() {
    const images = [
        'images/default-avatar.png',
        'images/default-article.jpg',
        './potager_logo_puma_1.png'
    ];
    
    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Optimiser Firebase pour réduire la latence
function optimizeFirebase() {
    // Activer la persistance pour le mode hors ligne et caching
    firebase.firestore().enablePersistence({ synchronizeTabs: true })
        .catch(err => {
            if (err.code === 'failed-precondition') {
                console.warn('La persistance Firebase ne peut pas être activée dans plusieurs onglets.');
            } else if (err.code === 'unimplemented') {
                console.warn('Le navigateur ne prend pas en charge la persistance Firebase.');
            }
        });
    
    // Garder une connexion persistante
    firebase.firestore().waitForPendingWrites()
        .then(() => console.log('Firebase prêt pour une utilisation optimale'));
}

// Appeler les fonctions d'optimisation au chargement
preloadDefaultImages();
optimizeFirebase();
});
