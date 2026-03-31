/**
 * carousel.js
 * ─────────────────────────────────────────────────────────────
 * Carrousel horizontal avec :
 *  - Défilement automatique continu (requestAnimationFrame)
 *  - Pause au survol et pendant le drag
 *  - Drag souris + tactile
 *  - Boucle infinie (les slides sont dupliqués en JS)
 *  - Curseur "Drag" personnalisé
 *  - Flèches de navigation
 *  - Compteur de slides
 *  - Navigation clavier ← →
 *
 * Usage :
 *   <script src="carousel.js"></script>
 *   (à placer avant </body>, après le HTML du carrousel)
 *
 * Paramètres personnalisables ↓
 * ─────────────────────────────────────────────────────────────
 */

(function () {

  /* ══════════════════════════════════════════
     ⚙️  PARAMÈTRES — modifie ici
  ══════════════════════════════════════════ */
  const SPEED = 0.6;   // px par frame (~60fps). Plus grand = plus rapide.
  const DIRECTION = 1;     // 1 = gauche→droite  |  -1 = droite→gauche
  const RESUME_DELAY = 1200;  // ms avant reprise après interaction
  const GAP = 12;    // doit correspondre au gap CSS du .carousel-track (px)
  /* ══════════════════════════════════════════ */


  /* ─── Éléments DOM ─── */
  const track = document.getElementById('track');
  const section = document.getElementById('carousel');
  const cursor = document.getElementById('dragCursor');
  const counter = document.getElementById('counter');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (!track || !section) return; // sécurité si le HTML est absent

  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  const total = slides.length;

  /* ─── Boucle infinie : on duplique les slides ─── */
  slides.forEach(slide => {
    const clone = slide.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  /* ─── État ─── */
  let autoX = 0;   // position du défilement auto (px, valeur réelle)
  let isHovered = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragDeltaX = 0;
  let resumeTimer = null;
  let rafId = null;

  /* ─── Largeur d'un slide + gap ─── */
  const slideWidth = () => slides[0].offsetWidth + GAP;

  /* ─── Largeur totale d'UN set (original, sans clones) ─── */
  const setWidth = () => slideWidth() * total;

  /* ─── Applique la position à la track ─── */
  function applyTransform(x) {
    track.style.transform = `translateX(${x}px)`;
  }

  /* ─── Boucle d'animation ─── */
  function animate() {
    if (!isHovered && !isDragging) {
      autoX -= SPEED * DIRECTION;

      // Boucle infinie : quand on a scrollé d'un set complet, on repart
      const sw = setWidth();
      if (DIRECTION > 0 && autoX <= -sw) {
        autoX += sw;
      } else if (DIRECTION < 0 && autoX >= 0) {
        autoX -= sw;
      }

      applyTransform(autoX + dragDeltaX);
      updateCounter(autoX + dragDeltaX);
    }
    rafId = requestAnimationFrame(animate);
  }

  /* ─── Démarrage ─── */
  animate();


  /* ════════════════════════════════════════
     CURSEUR PERSONNALISÉ
  ════════════════════════════════════════ */
  section.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });

  section.addEventListener('mouseenter', () => {
    cursor.style.transform = 'translate(-50%,-50%) scale(1)';
    cursor.style.opacity = '1';
    // isHovered = true  ← retiré : le défilement ne se met plus en pause au survol
  });

  section.addEventListener('mouseleave', () => {
    cursor.style.transform = 'translate(-50%,-50%) scale(0)';
    cursor.style.opacity = '0';
    // isHovered = false ← inutile, on ne la modifie plus ici
  });


  /* ════════════════════════════════════════
     DRAG SOURIS
  ════════════════════════════════════════ */
  track.addEventListener('mousedown', e => {
    isDragging = true;
    dragStartX = e.clientX;
    dragDeltaX = 0;
    cursor.textContent = '↔';
    track.style.transition = 'none';
    clearTimeout(resumeTimer);
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    dragDeltaX = e.clientX - dragStartX;
    applyTransform(autoX + dragDeltaX);
    updateCounter(autoX + dragDeltaX);
  });

  window.addEventListener('mouseup', e => {
    if (!isDragging) return;
    isDragging = false;
    autoX += dragDeltaX; // intègre le delta dans la position auto
    dragDeltaX = 0;

    // Normalise dans la plage de boucle
    const sw = setWidth();
    autoX = ((autoX % sw) - sw) % -sw; // reste toujours négatif dans [0, -sw]

    cursor.textContent = 'Drag';

    // Reprend l'auto-scroll après un délai
    resumeTimer = setTimeout(() => { isHovered = false; }, RESUME_DELAY);
  });


  /* ════════════════════════════════════════
     DRAG TACTILE
  ════════════════════════════════════════ */
  track.addEventListener('touchstart', e => {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragDeltaX = 0;
    clearTimeout(resumeTimer);
  }, { passive: true });

  track.addEventListener('touchmove', e => {
    if (!isDragging) return;
    dragDeltaX = e.touches[0].clientX - dragStartX;
    applyTransform(autoX + dragDeltaX);
    updateCounter(autoX + dragDeltaX);
  }, { passive: true });

  track.addEventListener('touchend', e => {
    isDragging = false;
    autoX += dragDeltaX;
    dragDeltaX = 0;
    const sw = setWidth();
    autoX = ((autoX % sw) - sw) % -sw;
    resumeTimer = setTimeout(() => { isHovered = false; }, RESUME_DELAY);
  });


  /* ════════════════════════════════════════
     FLÈCHES
  ════════════════════════════════════════ */
  function shiftBySlide(direction) {
    isHovered = true; // stoppe l'auto pendant l'animation
    autoX -= slideWidth() * direction;
    const sw = setWidth();
    autoX = ((autoX % sw) - sw) % -sw;
    track.style.transition = 'transform 0.45s cubic-bezier(.25,.46,.45,.94)';
    applyTransform(autoX);
    updateCounter(autoX);
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      isHovered = false;
      track.style.transition = 'none';
    }, 600);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => shiftBySlide(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => shiftBySlide(1));


  /* ════════════════════════════════════════
     CLAVIER
  ════════════════════════════════════════ */
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') shiftBySlide(1);
    if (e.key === 'ArrowLeft') shiftBySlide(-1);
  });


  /* ════════════════════════════════════════
     COMPTEUR
  ════════════════════════════════════════ */
  function updateCounter(offset) {
    if (!counter) return;
    const sw = slideWidth();
    // Normalise l'offset pour trouver l'index dans le set original
    const pos = ((-offset % (sw * total)) + sw * total) % (sw * total);
    const idx = Math.floor(pos / sw) % total;
    counter.textContent =
      String(idx + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
  }

})();


















/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MENU BURGER MOBILE CUSTOM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
const mobileMenuClose = document.getElementById('mobileMenuClose');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

// Ouvrir/Fermer le menu avec toggle
if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenuToggle.classList.toggle('active');
    mobileMenuOverlay.classList.toggle('active');
    if (mobileMenuToggle.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });
}

// Fermer le menu quand on clique sur un lien
mobileNavLinks.forEach(link => {
  link.addEventListener('click', () => {
    mobileMenuToggle.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
    document.body.style.overflow = '';
  });
});

// Fermer le menu quand on clique en dehors (sur le fond gris)
mobileMenuOverlay.addEventListener('click', (e) => {
  if (e.target === mobileMenuOverlay) {
    mobileMenuToggle.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */






















/* ------------------------- Scroll Header ------------------------*/

let header = document.querySelector(".header");
let lastScrollValue = 0;

document.addEventListener('scroll', () => {
  let top = document.documentElement.scrollTop;
  if (lastScrollValue < top) {
    header.classList.add("hidden");
    header.classList.remove("aparition");
  } else {
    header.classList.remove("hidden");
    header.classList.add("aparition");
  }
  lastScrollValue = top;
});

/* ------------------------- Scroll Header ------------------------*/


/* ------------------------- Modale ------------------------*/

const projets = [
  {
    titre: "Le Pont du diable",
    subtitle: "2025 — Court-métrage",
    description: `<h5 class="mb-3 typo_texte">
                    Au lycée, dans le cadre de la spécialité Cinéma Audiovisuel, en équipe de 3,
                    J’ai <strong>écrit</strong>, <strong>tourné</strong> et <strong>monté</strong> un court métrage de 10 minutes sur le thème d’une légende urbaine… <br>
                    <strong>“Le
                    Pont du Diable”</strong>
                </h5>

                <div class="tags are-small mb-3 typo_texte">
                   
                    <span class="tag is-rounded">Audiovisuelle</span>
                </div>

                <div class="subtitle m-3 boldee">Démarche</div>
                <p class="typo_texte">
                    Écriture<br>
                    Tournage<br>
                    Montage<br>
                    Présenté au cinéma

                </p>
                <div class="subtitle m-3 boldee">Compétence</div>
                <p class="typo_texte">
                    Travail en équipe <br>
                    Écriture :<br>
                    Rédaction d’un pitch, d’un synopsis, d’un script et création du découpage technique<br>
                    Tournage :<br>
                    Gestion d’un tournage, <strong>prise de vue et de son</strong>, direction des acteurs<br>
                    Montage :<br>
                    <strong>Montage</strong>, mixage sons, étalonnage



                </p>
                <div class="subtitle m-3 boldee">Bilan</div>
                <p class="mb-5 typo_texte">
                    “Le Pont du Diable” m’a profondément <strong>marqué</strong>, après <strong>1 an</strong> à travailler dessus, c’est le projet dont je
                    suis le plus <strong>fier</strong>. Et c’est grâce à lui que j’ai <strong>envie</strong> de travailler dans les métiers de
                    <strong>l'audiovisuel !</strong> J'ai développé mes compétences en audiovisuelles et en travail d'équipe.
                </p>`,
    images: ["../media/image/Le_Pont_du_Diable.avif"],
    techs: ["Davinci Resolve","Stabilisateur Ronin"],
    
    live: "https://youtu.be/BNDwayE_Pic?si=wIToKjqpyqeZnF-H"
  },
  {
    titre: "Le Coffret Rider",
    subtitle: "2026 ",
    description: `<h5 class="mb-3 typo_texte">Dans le cadre d’une formation proposée par <strong>Pépite Bretagne</strong>. Fabrik
                    ta pépite
                    nous encourage et nous accompagne dans la réalisation d’un<strong> projet entrepreneurial</strong> en groupe de 3.<br>
                    Mon idée : <strong>une boîte à clés pour ranger les cartes électroniques</strong> de voiture directement accroché à
                    la roue pour les surfeurs.
                </h5>

                <div class="tags are-small mb-3 typo_texte">
                    <span class="tag is-rounded">Entrepreneurial</span>
                    <span class="tag is-rounded">Audiovisuelle</span>
                </div>

                <div class="subtitle m-3 boldee">Démarche</div>
                <p class="typo_texte">
                    L'idée : <strong>une boîte à clé qui bloque les ondes</strong> des cartes de voiture électrique <br>
                    Est ce qu’elle répond à un problème <strong>réel</strong> ?<br>
                    La cible : <strong>Le surfeur</strong> / Le pratiquant d’activité nautique<br>
                    Enquête terrain<br>
                    <strong>Prototypage</strong><br>
                    Positionnement de l’offre<br>
                    Business plan<br>
                    Réalisation d’un <strong>court-métrage promotionnel</strong>

                </p>
                <div class="subtitle m-3 boldee">Compétence</div>
                <p class="typo_texte">
                    <strong>Entreprendre</strong> et gérer un projet<br>
                    Concevoir un produit fonctionnel.<br>
                    Réaliser une <strong>enquête terrain</strong>.<br>
                    Positionner notre offre.<br>
                    Compétence oratoire, capacité à vendre et à<strong> pitcher son produit</strong>



                </p>
                <div class="subtitle m-3 boldee">Bilan</div>
                <p class="mb-5 typo_texte">
                    À la base, j’avais juste envie de participer à une formation sur l'entrepreneuriat, mais je n’aurais
                    pas pensé <strong>m’investir</strong> autant dans le projet. Sans doute parce que c’est moi qui ai eu <strong>l’idée de
                    départ</strong>. Mais surtout car notre idée répondait à un <strong>problème réel</strong>. Mes premiers pas dans le monde de
                    l'entrepreneuriat furent <strong>très enrichissants</strong>.


                </p>`,
    images: ["../media/image/pepite_img.avif"],
    techs: ["Matériel audiovisuel", "Davinci Resolve"],
    live: "https://youtu.be/LdqSVCIPrcc?si=cBho8DFe_P-Hc8fG"
  },
  {
    titre: "“Bref, j’ai passé un entretien”",
    subtitle: "2026 — Court-métrage",
    description: `<h5 class="mb-3 typo_texte">
                    En équipe de quatre, en décembre 2025, nous avons réalisé un
                    court-métrage de
                    <strong>sensibilisation</strong> sur les <strong>disparités hommes/femmes</strong> au travail.
                </h5>

                <div class="tags are-small mb-3 typo_texte">
                   
                    <span class="tag is-rounded">Audiovisuelle</span>
                </div>

                <div class="subtitle m-3 boldee">Démarche</div>
                <p class="typo_texte">
                    Création d’un dossier de production complet, du synopsis à la note d’intention <br>
                    Repérage et <strong>préparation du tournage</strong><br>
                    Tournage : j’avais le rôle <strong>d'ingénieur du son</strong>.<br>
                    Un montage peu complexe car on était limité en temps.

                </p>
                <div class="subtitle m-3 boldee">Compétence</div>
                <p class="typo_texte">
                   Tournage :
                    Gestion d’un tournage, prise de vue et de son, direction des acteurs<br>
                    Montage :
                    Montage, mixage sons, étalonnage
                </p>
                <div class="subtitle m-3 boldee">Bilan</div>
                <p class="mb-5 typo_texte">
                    Ce projet audiovisuel a été pour moi un peu différent car je me suis joint en cours de route au
                    projet. Je me suis <strong>intégré au projet</strong>, j'ai compris les idées des réalisateurs. Je pourrais me
                    considérer comme ingénieur du son dans une grosse production, qui n'a pas été présent lors de
                    l'écriture mais qui doit comprendre les <strong>intentions du réalisateur</strong> pour réussir au mieux son travail.
                    Ce projet a développé mes compétences en prise de sons et en montage.
                </p>`,
    images: ["../media/image/Bran.avif", "../media/image/Nora.avif"],
    techs: ["Davinci Resolve"],
    
    live: "https://youtu.be/_ijcJfTg4ws?si=7qaTj5s0cdyNVwzf"
  },
  {
    titre: "Abyssal Vault",
    subtitle: "2026 — Une collection pokémon",
    description: `<h5 class="mb-3 typo_texte">
                    En janvier 2026, j'ai <strong>conçu, développé et déployé</strong> un site web sur la
                    thématique de <strong>Pokémon.</strong> J’ai maîtrisé le <strong>framework CSS Bulma</strong> et j’ai renforcé mes compétences en
                    JavaScript. 
                </h5>

                <div class="tags are-small mb-3 typo_texte">
                   
                    <span class="tag is-rounded">Développement Web</span>
                    <span class="tag is-rounded">UI/UX Design</span>
                </div>

                <div class="subtitle m-3 boldee">Démarche</div>
                <p class="typo_texte">
                    Création d’une planche univers<br>
                    Choix d’un univers et réflexion des pistes graphiques<br>
                    Validation du <strong>wireframe</strong><br>
                    Validation du <strong>mock-up</strong><br>
                    Retranscription du mock-up en code HTML/CSS<br>
                    <strong>Déploiement sur le serveur</strong> de l’IUT de Lannion

                </p>
                <div class="subtitle m-3 boldee">Compétence</div>
                <p class="typo_texte">
                   Répondre à un <strong>brief</strong><br>
                    conception de wireframe<br>
                    conception de mock-up en rapport avec <strong>l'univers graphique choisi</strong><br>
                    Création de site web en <strong>HTML, CSS et Javascript</strong>
                </p>
                <div class="subtitle m-3 boldee">Bilan</div>
                <p class="mb-5 typo_texte">
                    Je suis fier d’avoir réalisé ce site web, je suis content qu’il soit plutôt <strong>responsive</strong> grâce à
                    Bulma, mais je suis déçu de ne pas avoir eu plus de temps pour travailler la partie <strong>JavaScript</strong>. J'ai
                    aussi appris à rendre <strong>accessible mon site via un serveur web</strong>.
                </p>`,
    images: ["../media/image/pokemon_2.avif", "../media/image/site_pokemon.avif", "../media/image/pokemon_1.avif"],
    techs: ["Figma","Visual Studio Code","HTML", "CSS", "JavaScript", "Bulma"],
    
    live: "https://matheo2904.github.io/Site_Pokemon/"
  },
  {
    titre: "Affiche : “À l’west Fest”",
    subtitle: "2026 — Créer une affiche pour un festival",
    description: `<h5 class="mb-3 typo_texte">
                    En décembre 2025, j'ai réalisé une <strong>affiche de promotion</strong> pour le festival  <strong>"À l'west Fest"</strong> sur Adobe Photoshop. Un festival qui met en compétition les meilleures réalisations multimédia des étudiants MMI. En essayant de retransmettre les <strong>valeurs de l'événement</strong>.
                </h5>

                <div class="tags are-small mb-3 typo_texte">
                   
                    <span class="tag is-rounded">Design Graphique</span>
                </div>

                <div class="subtitle m-3 boldee">Démarche</div>
                <p class="typo_texte">
                    Recherche de l’existant <br>
                    Brainstorming<br>
                    <strong>Recherches graphiques</strong><br>
                    <strong>Maquettage</strong><br>
                    Finalisation du travail<br>
                    <strong>Validation de l’affiche finale</strong> et présentation devant un jury.


                </p>
                
                <div class="subtitle m-3 boldee">Bilan</div>
                <p class="mb-5 typo_texte">
                    Un projet original qui m’a laissé le temps de <strong>progresser</strong> sur <strong>Adobe Photoshop</strong>.
                     J'ai découvert l'importance de la <strong>hiérarchie visuelle</strong> pour capter l'attention.
                     Et j’ai aussi beaucoup travaillé la <strong>typographie</strong> qui doit bien correspondre à l’essence du festival.
                      Je suis fier de mon travail.
                </p>`,
    images: ["../media/image/SAE103/maketage_V8_final.avif", "../media/image/SAE103/maketagev1.avif", "../media/image/SAE103/maketageV2.avif", "../media/image/SAE103/maketageV4.avif", "../media/image/SAE103/maketageV6_1.avif", "../media/image/SAE103/maketageV7_1.avif",],
    techs: ["Adobe Photoshop"],
   

    live: null
  },
  {
    titre: "Art & Fact",
    subtitle: "2026 — Podcast en studio",
    description: `<h5 class="mb-3 typo_texte">
                    En novembre 2025, en groupe de quatre, j’ai réalisé un podcast en studio sur le thème de <strong>l’art et du numérique</strong>. 
                </h5>

                <div class="tags are-small mb-3 typo_texte">
                   
                    <span class="tag is-rounded">Audiovisuelle</span>
                    <span class="tag is-rounded">Communication</span>
                </div>

                <div class="subtitle m-3 boldee">Démarche</div>
                <p class="typo_texte">
                    Brainstorming<br>
                    Recherche documentaire avec des ressources fiables<br>
                    Écriture du script pour le multimédia<br>
                    Entraînement au débat, mise en voix<br>
                    Tournage en studio


                </p>
                <div class="subtitle m-3 boldee">Compétence</div>
                <p class="typo_texte">
                   Réalisé une recherche documentaire<br>
                    Écrire un script<br>
                   <strong> Capacité oratoire </strong><br>
                    S’exprimer, <strong>débattre</strong> face à un micro et une caméra

                </p>
                <div class="subtitle m-3 boldee">Bilan</div>
                <p class="mb-5 typo_texte">
                    J’ai appris à m'exprimer sur un support novateur et à comprendre les <strong>étapes de la chaîne de production</strong>.
                     J’ai apprécié l'expérience d'être plongé dans l'émission malgré quelques appréhensions au début.

                </p>`,
    images: ["../media/image/podcast.png"],
    techs: ["Google Docs", "Supernova"],
    
    live: "https://youtu.be/6v9C2QARY0U?si=0w7svOq5MByNHvxs"
  }

];

let galIndex = 0;
let galImages = [];

function openModal(index) {
  const p = projets[index];
  document.getElementById('modalTitle').textContent = p.titre;
  document.getElementById('modalSubtitle').textContent = p.subtitle;
  document.getElementById('modalDesc').innerHTML = p.description;
 
  document.getElementById('modalLive').href = p.live;

  const liveBtn = document.getElementById('modalLive');
  if (p.live) {
    liveBtn.href = p.live;
    liveBtn.style.display = '';
  } else {
    liveBtn.style.display = 'none';
  }
  

  // Techs
  const techs = document.getElementById('modalTechs');
  techs.innerHTML = p.techs.map(t => `<span class="tech-tag">${t}</span>`).join('');

  // Galerie
  galImages = p.images;
  galIndex = 0;
  const gallery = document.getElementById('modalGallery');
  gallery.innerHTML = p.images.map(src => `<img src="${src}" alt="">`).join('');
  gallery.style.transform = 'translateX(0)';

  // Dots
  const dots = document.getElementById('galleryDots');
  dots.innerHTML = p.images.map((_, i) =>
    `<div class="gallery-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></div>`
  ).join('');

  // Masquer les boutons de navigation et les points si une seule image
  const prevBtn = document.querySelector('.gal-btn.prev');
  const nextBtn = document.querySelector('.gal-btn.next');
  if (p.images.length === 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    dots.style.display = 'none';
  } else {
    prevBtn.style.display = '';
    nextBtn.style.display = '';
    dots.style.display = '';
  }

  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function closeModalIfOutside(e) {
  if (e.target.id === 'modalOverlay') closeModal();
}

function slideGallery(dir) {
  goToSlide((galIndex + dir + galImages.length) % galImages.length);
}

function goToSlide(n) {
  galIndex = n;
  document.getElementById('modalGallery').style.transform = `translateX(-${n * 100}%)`;
  document.querySelectorAll('.gallery-dot').forEach((d, i) =>
    d.classList.toggle('active', i === n)
  );
}

// Fermer avec Echap
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});


/* ------------------------- Modale ------------------------*/
