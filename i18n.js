/**
 * Système i18n pour Beyrouth Express
 * Gère français et anglais avec détection auto + switch manuel
 */

// Traductions complètes FR/EN
const translations = {
  fr: {
    // SEO & Meta
    meta: {
      title: "Restaurant Libanais La Défense - A Beyrouth | Click & Collect",
      description: "Restaurant libanais A Beyrouth à La Défense Courbevoie. Commandez en ligne : shawarma, mezze, grillades, falafel. Retrait express 15 min. Cartes restaurant acceptées (Swile, Ticket Restaurant, Conecs).",
      ogTitle: "A Beyrouth · Restaurant Libanais La Défense",
      ogDescription: "Cuisine libanaise authentique à La Défense. Commandez en ligne, retirez en 15 min. Cartes restaurant acceptées.",
      cuisine: "Libanaise",
      paymentMethods: "Carte bancaire, Swile, Ticket Restaurant, Restoflash, Conecs"
    },

    // Header & Navigation
    aria: {
      close: "Fermer", closeCart: "Fermer le panier", firstName: "Prénom", phone: "Téléphone",
      note: "Note pour le restaurant", googleReview: "Laisser un avis Google"
    },
    nav: {
      orderNow: "Commander",
      menu: "Menu",
      catering: "Traiteur",
      contact: "Contact"
    },

    // Timepicker & Pickup
    timepicker: {
      chooseSlot: "Choisir un créneau",
      prep15min: "~10 min de préparation",
      orChooseSlot: "ou choisir un créneau",
      pickupTime: "Retrait prévu",
      noQueue: "Pas de queue : direct à la caisse",
      asap: "Dès que possible",
      asapDelay: "Dès que possible (~10 min)",
      nextSlot: "Créneau le plus proche",
      closesAt: "Ferme à",
      open: "Ouvert",
      // Ajouts etape 6 (statut d en tete, accueil et traiteur)
      closed: "Fermé",
      tempClosure: "Fermeture temporaire",
      nextPickup: "prochain retrait",
      until: "jusqu'à",
      // Separateur d heure : « 20h30 » en francais, « 20:30 » en anglais.
      hourSep: "h",
      // Libelle du prochain creneau (affichage seulement, la valeur enregistree reste en francais)
      today: "Aujourd'hui",
      tomorrow: "Demain"
    },

    // Jours de la semaine, dans l ordre de getDay() : 0 = dimanche.
    days: {
      sunday: "Dimanche", monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi",
      thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi"
    },

    // Cart & Checkout
    cart: {
      each: "chacun",
      notePh: "Note : allergies, sans oignon, etc.",
      viewCart: "Voir le panier",
      namePh: "Prénom",
      phonePh: "Téléphone (ex: 0612345678)",
      placeOrder: "Passer la commande",
      modify: "Modifier",
      addToCart: "Ajouter au panier",
      pickupTime: "Heure de retrait",
      yourOrder: "Votre commande",
      empty: "Votre panier est vide",
      add: "Ajouter",
      remove: "Retirer",
      total: "Total",
      subtotal: "Sous-total",
      optin: "Me tenir informé des offres et promotions",
      securePayment: "Paiement en ligne sécurisé (CB, carte restaurant)",
      payNow: "Payer",
      openingPayment: "Ouverture du paiement…",
      orderNow: "Commander maintenant",
      // Ajouts etape 6 (bloc panier). Les valeurs FR sont copiees a l identique
      // depuis index.html : aucun texte francais ne change a l ecran.
      tempClosed: "Le click & collect est temporairement fermé.\nRéouverture prochaine.",
      formulaAdded: "Formule ajoutée au panier",
      drinkWithThat: "Une boisson avec ça ?",
      // Message d indisponibilite. Fonction car le pluriel et les noms varient.
      removedUnavailable: (noms, pluriel) =>
        `${noms} ${pluriel ? 'ne sont plus disponibles' : "n'est plus disponible"} et ${pluriel ? 'ont été retirés' : 'a été retiré'} de votre panier`
    },

    // Menu Items
    menu: {
      loading: "Chargement du menu…",
      customize: "Personnalisez votre formule",
      soonAvailable: "Bientôt disponible",
      formula1: "Formule 1",
      formula1Desc: "sandwich + 2 feuilletés + boisson",
      addDrink: "Une boisson fraîche avec votre plat ?",
      from: "À partir de"
    },

    // Order Status
    status: {
      paid: "Payée",
      paidDesc: "Commande reçue et payée",
      accepted: "Acceptée",
      acceptedDesc: "Le restaurant a accepté votre commande",
      preparing: "En préparation",
      preparingDesc: "Votre commande est en cours de préparation",
      ready: "Prête",
      readyDesc: "Venez récupérer votre commande",
      pickedUp: "Récupérée",
      pickedUpDesc: "Bon appétit",
      cancelled: "Annulée"
    },

    // Confirmation Page
    confirmation: {
      backToMenu: "Retour au menu",
      loading: "Chargement de votre commande…",
      title: "Commande confirmée | Beyrouth Express",
      paymentValidated: "Paiement validé",
      orderRegistered: "Votre commande a été enregistrée",
      pickupTime: "Retrait prévu",
      whereToPickup: "Où récupérer",
      address: "4 Esplanade du Général de Gaulle<br>92400 Courbevoie (La Défense)",
      metro: "Sortie 4 du métro La Défense",
      openMaps: "Ouvrir dans Google Maps",
      seeCart: "Voir le panier",
      metroShort: "La Défense · Sortie 4 Métro",
      youMayLike: "Vous aimerez aussi",
      examining: "Le restaurant examine votre commande.<br>Vous recevrez un email dès validation.",
      emailSent: "Email envoyé",
      willNotify: "Vous serez notifié dès validation",
      preparing: "Préparation en cours",
      readyAt: "Votre commande sera prête à",
      orderAccepted: "Commande acceptée",
      orderReady: "Votre commande est prête",
      canPickup: "Vous pouvez venir la récupérer au restaurant",
      skipQueue: "<b>Pas besoin de faire la queue</b> : présentez-vous directement à la caisse, votre commande",
      skipQueueEnd: "vous y attend.",
      skipQueueAt: "À l'heure du retrait, <b>pas besoin de faire la queue</b> : présentez-vous directement à la caisse avec le numéro",
      yourNumber: "Votre numéro",
      commandReady: "Commande prête",
      pickupNow: "Venez la récupérer chez A Beyrouth",
      seeyouSoon: "À très bientôt chez A Beyrouth",
      // Ajouts etape 6 (page de confirmation). Textes copies A L IDENTIQUE
      // depuis confirmation.html, y compris la ponctuation : certains
      // ressemblent aux cles ci dessus mais n en sont pas (« Commande
      // acceptée » sans point d exclamation existe deja au dessus).
      willConfirmSoon: "Votre commande va être confirmée dans quelques instants",
      orderAcceptedExcl: "Commande acceptée",
      beingPrepared: "Votre commande est en préparation",
      comePickUp: "Venez la récupérer",
      enjoyMeal: "Bon appétit",
      orderPickedUp: "Commande récupérée",
      thanksForOrder: "Merci pour votre commande",
      thankYouSoon: "Merci et à bientôt",
      orderCancelled: "Commande annulée",
      refundInProgress: "Remboursement en cours",
      refundDelay: "Le remboursement sera effectué sous 5 à 7 jours ouvrés.",
      cancellationEmailSent: "Email d'annulation envoyé",
      autoRefresh: "Cette page se met à jour automatiquement",
      asapLower: "dès que possible",
      willBeReady: "Votre commande sera prête"
    },

    // Admin
    admin: {
      login: "Entrez le code admin pour accéder",
      completedOrders: "Commandes terminées",
      noCompleted: "Aucune commande terminée",
      toggleDishes: "Activez/désactivez des plats individuellement. Les changements sont visibles instantanément chez les clients.",
      year: "Année",
      delaySlots: "⏸️ Décaler créneaux :",
      untilTomorrow: "Jusqu'à demain",
      reminded: "Relancé il y a",
      asap: "Dès que possible",
      pickedUp: "Récupérée",
      completed: "✓ Terminée",
      irreversible: "Cette action est irréversible.",
      spent: "dépensé",
      last: "dernière",
      totalSpent: "Total dépensé",
      favDishes: "Plats préférés"
    },

    // Emails
    email: {
      orderConfirmed: "Commande confirmée",
      number: "Numéro",
      seeyouSoon: "À bientôt",
      paymentConfirmed: "Paiement confirmé",
      paymentReceived: "Paiement reçu",
      secondEmail: "Vous recevrez un second email avec le récapitulatif dès que le restaurant aura validé votre commande.",
      orderNumber: "Numéro de commande",
      scheduledTime: "Heure prévue",
      quoteReceived: "Demande bien reçue",
      answerIn48h: "Réponse sous 48h",
      requestRegistered: "Demande enregistrée",
      studyRequest: "Notre équipe va étudier votre demande et vous envoyer un devis personnalisé dans les 48 heures.",
      summary: "Récapitulatif",
      eventType: "Type d'événement",
      desiredDate: "Date souhaitée",
      orderDetail: "Détail de votre commande",
      pickupLocation: "Lieu de retrait",
      atBeyrouth: "A Beyrouth",
      viewMaps: "Voir sur Google Maps",
      totalHT: "Total HT",
      vat10: "TVA 10%",
      totalTTC: "Total TTC",
      yourOrderReady: "Votre commande vous attend",
      reminderReady: "Rappel : votre commande est prête au retrait.",
      orderAccepted: "Commande acceptée",
      preparing: "En cours de préparation",
      pickupCode: "Votre code de retrait",
      showCounter: "À présenter au comptoir",
      readyFor: "Sera prête pour",
      viewRoute: "Voir l'itinéraire",
      preparingCare: "On prépare votre commande avec soin",
      questions: "Des questions ? contact@beyrouth.express",
      beyrouthDesc: "A Beyrouth · Cuisine libanaise authentique"
    },

    // Catering
    catering: {
      promoTitle: "Traiteur & événements",
      promoSubtitle: "Buffets et plateaux pour vos événements professionnels et privés, devis gratuit sous 48h",
      promoCta: "Demander un devis",
      promoCtaArrow: "Demander un devis →",
      promoCtaShort: "Découvrir",
      promoCompactCta: "Devis",
      closeAnnouncement: "Fermer",
      freeQuote: "Devis gratuit sous 48h",
      buffetsSubtitle: "Buffets sur mesure, préparés avec passion.",
      title: "Cuisine Libanaise<br>pour vos Événements",
      customBuffets: "Buffets personnalisés pour événements pro et privés",
      delivery: "Livraison et installation possible (La Défense & environs)",
      vegOptions: "Options végétariennes et vegan",
      pricing: "À partir de 18€/pers · Minimum 10 personnes",
      formIntro: "Remplissez ce formulaire et nous vous répondrons sous 48h avec un devis personnalisé",
      professional: "Événement professionnel",
      private: "Célébration privée",
      seminar: "Séminaire / Formation",
      cocktail: "Cocktail / Réception",
      answerIn48h: "Nous vous répondrons sous 48h avec un devis personnalisé",
      // Ajouts etape 6 (envoi du formulaire de devis)
      quoteSent: "Demande envoyée. Vous recevrez un email de confirmation. Réponse sous 48h.",
      quoteSentBtn: "Demande envoyée ✓",
      quoteSending: "Envoi en cours…",
      quoteError: "Erreur lors de l'envoi. Veuillez réessayer ou nous contacter à traiteur@beyrouth.express"
    },

    // Form Labels
    form: {
      other: "Autre",
      choose: "Choisir",
      name: "Votre nom",
      firstName: "Prénom",
      lastName: "Nom",
      email: "Email",
      phone: "Téléphone",
      company: "Nom de la société",
      eventType: "Type d'événement",
      guests: "Nombre de personnes",
      date: "Date de l'événement",
      message: "Votre message",
      submit: "Envoyer ma demande",
      generateInvoice: "Générer ma facture",
      enterOrderNumber: "Entrez votre numéro de commande"
    },

    // Validation du formulaire de commande (etape 6, bloc 2).
    // Textes copies a l identique depuis index.html : le francais ne change pas.
    // Les emojis restent dans le code appelant, pas dans le dictionnaire.
    validation: {
      required: "Ce champ est obligatoire",
      emailFormat: "Saisissez une adresse email valide",
      phoneFormat: "Saisissez un numéro de téléphone valide",
      minGuests: "Prévoyez au moins 10 personnes",
      firstNameRequired: "Entrez votre prénom",
      firstNameInvalid: "Prénom invalide (lettres uniquement, 2-50 car.)",
      phoneRequired: "Entrez votre téléphone",
      phoneInvalid: "Numéro invalide (ex: 0612345678 ou +33612345678)",
      emailRequired: "Email OBLIGATOIRE pour recevoir la confirmation",
      emailInvalid: "Email invalide (ex: nom@gmail.com)",
      pickupRequired: "Choisissez une heure de retrait",
      closedChooseOther: "Le restaurant est fermé. Choisissez un autre créneau."
    },

    // Erreurs de paiement montrees au client (etape 6, bloc 3).
    // Avant, le message BRUT de la base ou du reseau s affichait tel quel :
    // un client a pu lire « new row violates row-level security policy ».
    // Le detail technique part desormais dans la console, pas a l ecran.
    errors: {
      // Echec AVANT l ouverture du paiement : aucun debit possible, la
      // commande est supprimee dans la foulee. On peut donc rassurer.
      beforePayment: "Votre commande n'a pas pu être enregistrée. Vous n'avez pas été débité. Réessayez dans un instant, ou appelez-nous au 01 47 74 88 12.",
      // Echec PENDANT ou APRES le paiement : un debit a pu avoir lieu.
      // On ne promet donc jamais qu il n y a pas eu de debit.
      duringPayment: "Le paiement n'a pas abouti. Si votre compte a été débité, appelez-nous au 01 47 74 88 12 : nous régularisons immédiatement.",
      network: "Connexion interrompue. Vérifiez votre réseau et réessayez.",
      // Le paiement n a meme pas pu demarrer (ex. redirection carte restaurant
      // qui echoue avant de partir) : aucun debit, on propose l autre moyen.
      paymentStart: "Le paiement n'a pas pu démarrer. Vous n'avez pas été débité. Réessayez, ou réglez par carte bancaire."
    },

    // Tunnel de paiement (etape 6, bloc 3). Textes copies a l identique.
    up: {
      f1: "<strong>Formule 1 à {prix}</strong> · sandwich + 2 feuilletés + boisson",
      f1Btn: "Passer en formule",
      sweet: "Finissez en douceur ! <strong>{nom}</strong> · {prix}",
      drink: "Une <strong>boisson fraîche</strong> avec votre plat ? À partir de <strong>2,00 €</strong>",
      drinkBtn: "Voir les boissons",
      ayran: "Accompagnez avec un <strong>Ayran</strong> · yaourt salé rafraîchissant {prix}",
    },
    pm: {
      expressUnavailable: "Paiement express indisponible, utilisez la carte ci-dessous",
      txMissing: "Erreur: ID de transaction introuvable",
      checkCard: "Vérifiez vos informations de carte",
      invalidNumber: "Numéro de carte invalide",
      sessionExpired: "Session expirée, rechargez la page",
      invalidCard: "Carte invalide : ",
      initError: "Erreur d'initialisation",
      edenredConnecting: "Connexion à Edenred…",
      linkExpiredTitle: "Lien de paiement expiré",
      linkExpiredHtml: "Ce lien de paiement a déjà été utilisé ou a expiré.<br><br>Si votre paiement a été accepté, vous recevrez une confirmation par email.<br>Sinon, merci de créer une nouvelle commande.",
      backHome: "Retour à l'accueil",
      backToCart: "Retour au panier",
      redirect: "Vous allez être redirigé vers la plateforme de connexion sécurisée",
      title: "Paiement sécurisé",
      order: "Commande",
      express: "Paiement express",
      or: "ou payer par carte ou titre-restaurant",
      card: "Carte bancaire",
      restoToggle: "Ou payer avec une carte restaurant",
      weekendHtml: "<strong>Les cartes restaurant sont uniquement acceptées du lundi au vendredi.</strong><br>\n                Veuillez utiliser une carte bancaire.",
      payNow: "Payer maintenant",
      secure: "Paiement 100% sécurisé - Données cryptées end-to-end",
      applePay: "Payer avec Apple Pay",
    },
    payment: {
      secureLoading: "Chargement sécurisé…",
      sdkFailed: "Erreur de chargement du système de paiement, rechargez la page",
      declined: "Paiement refusé par votre banque",
      tooLong: "Le paiement prend trop de temps. Si vous avez validé, vérifiez votre commande dans quelques minutes.",
      checking: "Vérification du paiement…",
      checkTimeout: "Délai de vérification dépassé. Vérifiez vos emails.",
      confirmed: "Paiement confirmé",
      cancelled: "Paiement annulé ou refusé",
      inProgress: "Vérification en cours... Vous recevrez un email de confirmation.",
      checkFailed: "Erreur de vérification. Contactez-nous si vous avez payé.",
      // Cartes restaurant (Edenred). Les horaires different selon l ecran :
      // ils sont repris tels quels, sans les uniformiser.
      mealCardWeekdaysHtml: "<strong>Les cartes restaurant sont acceptées du lundi au samedi de 11h30 à 22h00.</strong><br>Veuillez utiliser une carte bancaire.",
      mealCardHoursHtml: "<strong>Les cartes restaurant sont uniquement acceptées de 11h30 à 22h00.</strong><br>Veuillez utiliser une carte bancaire.",
      mealCardWeekdays: "Les cartes restaurant ne sont acceptées que du lundi au samedi de 11h30 à 21h00",
      mealCardHours: "Les cartes restaurant ne sont acceptées que de 11h30 à 21h00",
      mealCardCapHtml: "<strong>Les cartes restaurant sont plafonnées à {cap} par jour.</strong><br>Votre panier est à {total}, le paiement sera refusé. Réglez par carte bancaire, ou retirez un article pour repasser sous {cap}.",
      mealCardCapToast: "Plafond des cartes restaurant : {cap} par jour. Votre panier est à {total}, le paiement sera refusé.",
      // Ecrans d erreur du retour carte restaurant
      timeoutTitle: "Délai dépassé",
      timeoutMsg: "Le serveur de paiement ne répond pas.<br><br>Veuillez vérifier votre connexion et réessayer, ou utiliser une carte bancaire.",
      notAllowedTitle: "Paiement non autorisé",
      notAllowedMsg: "Les cartes restaurant ne peuvent être utilisées que <strong>du lundi au vendredi</strong>.<br><br>Merci de réessayer en semaine ou d'utiliser une carte bancaire.",
      limitTitle: "Limite dépassée",
      limitMsg: "Le montant dépasse la limite de votre carte restaurant.<br><br>Veuillez utiliser une carte bancaire.",
      unavailableTitle: "Service temporairement indisponible",
      unavailableMsg: "Le service de paiement Edenred est momentanément indisponible.<br><br>Veuillez réessayer dans quelques instants ou utiliser une carte bancaire.",
      errorTitle: "Erreur de paiement"
    },

    // Messages & Notifications
    messages: {
      orderNotFound: "Commande introuvable. Vérifiez le numéro.",
      orderLoadError: "Erreur de chargement de la commande",
      invoiceGenerated: "Facture générée",
      generatingInvoice: "Génération de facture",
      emailConfirmSent: "Email de confirmation envoyé",
      enjoyMeal: "Bon appétit",
      thankYou: "Merci et à bientôt",
      detail: "Détail"
    },

    // Footer
    banner: {
      message: "Le four se repose, l'équipe aussi. Bel été à vous.",
      reopening: "Réouverture le lundi 31 août",
      closed: "Fermé pour congés",
    },
    footer: {
      leaveReview: "Laisser un avis",
      hours: "Click & collect 7j/7 · Retrait Lun-Ven 11h30-20h30",
      onlineService: "Service en ligne de A Beyrouth",
      address: "4 Esplanade du Général de Gaulle, 92400 Courbevoie",
      metro: "Sortie 4 du métro",
      visit: "Nous trouver",
      openingHours: "Horaires",
      pickup: "Retrait",
      weekHours: "Lun-ven · 11h30-20h30",
      everyDay: "7j/7",
      cateringTitle: "Traiteur & événements",
      cateringDescription: "Buffets et plateaux pour vos événements",
      cateringCta: "Demander un devis →",
      menu: "La carte",
      sandwiches: "Sandwichs",
      formulas: "Formules",
      plates: "Assiettes",
      mezze: "Mezzés"
    }
  },

  en: {
    // SEO & Meta
    meta: {
      title: "Lebanese Restaurant La Défense - A Beyrouth | Click & Collect",
      description: "A Beyrouth Lebanese restaurant in La Défense Courbevoie. Order online: shawarma, mezze, grills, falafel. Express pickup 15 min. Restaurant vouchers accepted (Swile, Ticket Restaurant, Conecs).",
      ogTitle: "A Beyrouth · Lebanese Restaurant La Défense",
      ogDescription: "Authentic Lebanese cuisine in La Défense. Order online, pick up in 15 min. Restaurant vouchers accepted.",
      cuisine: "Lebanese",
      paymentMethods: "Credit card, Swile, Ticket Restaurant, Restoflash, Conecs"
    },

    // Header & Navigation
    aria: {
      close: "Close", closeCart: "Close cart", firstName: "First name", phone: "Phone",
      note: "Note for the restaurant", googleReview: "Leave a Google review"
    },
    nav: {
      orderNow: "Order Now",
      menu: "Menu",
      catering: "Catering",
      contact: "Contact"
    },

    // Timepicker & Pickup
    timepicker: {
      chooseSlot: "Choose a time slot",
      prep15min: "~10 min preparation",
      orChooseSlot: "or choose a time slot",
      pickupTime: "Pickup time",
      noQueue: "No queue: straight to the counter",
      asap: "As soon as possible",
      asapDelay: "As soon as possible (~10 min)",
      nextSlot: "Next available slot",
      closesAt: "Closes at",
      open: "Open",
      // Step 6 additions (header status)
      closed: "Closed",
      tempClosure: "Temporarily closed",
      nextPickup: "next pickup",
      until: "until",
      // Hour separator: "20:30" in English, "20h30" in French.
      hourSep: ":",
      today: "Today",
      tomorrow: "Tomorrow"
    },


    // Days of the week, in getDay() order: 0 = Sunday.
    days: {
      sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
      thursday: "Thursday", friday: "Friday", saturday: "Saturday"
    },

    // Cart & Checkout
    cart: {
      each: "each",
      notePh: "Note: allergies, no onion, etc.",
      viewCart: "View cart",
      namePh: "First name",
      phonePh: "Phone (e.g. 0612345678)",
      placeOrder: "Place order",
      modify: "Edit",
      addToCart: "Add to cart",
      pickupTime: "Pickup time",
      yourOrder: "Your Order",
      empty: "Your cart is empty",
      add: "Add",
      remove: "Remove",
      total: "Total",
      subtotal: "Subtotal",
      optin: "Keep me informed of offers and promotions",
      securePayment: "Secure online payment (credit card, restaurant voucher)",
      payNow: "Pay Now",
      openingPayment: "Opening payment…",
      orderNow: "Order Now",
      // Ajouts etape 6 (bloc panier)
      tempClosed: "Click & collect is temporarily closed.\nReopening soon.",
      formulaAdded: "Meal deal added to cart",
      drinkWithThat: "A drink with that?",
      removedUnavailable: (noms, pluriel) =>
        `${noms} ${pluriel ? 'are no longer available' : 'is no longer available'} and ${pluriel ? 'have' : 'has'} been removed from your cart`
    },

    // Menu Items
    menu: {
      loading: "Loading menu…",
      customize: "Customise your meal deal",
      soonAvailable: "Available soon",
      formula1: "Combo 1",
      formula1Desc: "sandwich + 2 pastries + drink",
      addDrink: "A refreshing drink with your meal?",
      from: "From"
    },

    // Order Status
    status: {
      paid: "Paid",
      paidDesc: "Order received and paid",
      accepted: "Accepted",
      acceptedDesc: "The restaurant accepted your order",
      preparing: "Preparing",
      preparingDesc: "Your order is being prepared",
      ready: "Ready",
      readyDesc: "Come pick up your order",
      pickedUp: "Picked up",
      pickedUpDesc: "Enjoy your meal",
      cancelled: "Cancelled"
    },

    // Confirmation Page
    confirmation: {
      backToMenu: "Back to menu",
      loading: "Loading your order…",
      title: "Order Confirmed | Beyrouth Express",
      paymentValidated: "Payment validated",
      orderRegistered: "Your order has been registered",
      pickupTime: "Scheduled pickup",
      whereToPickup: "Where to pick up",
      address: "4 Esplanade du Général de Gaulle<br>92400 Courbevoie (La Défense)",
      metro: "Metro Exit 4 La Défense",
      openMaps: "Open in Google Maps",
      seeCart: "View cart",
      metroShort: "La Défense · Metro exit 4",
      youMayLike: "You may also like",
      examining: "The restaurant is reviewing your order.<br>You will receive an email upon confirmation.",
      emailSent: "Email sent",
      willNotify: "You will be notified upon confirmation",
      preparing: "Preparation in progress",
      readyAt: "Your order will be ready at",
      orderAccepted: "Order accepted",
      orderReady: "Your order is ready",
      canPickup: "You can pick it up at the restaurant",
      skipQueue: "<b>No need to queue</b>: go straight to the till, your order",
      skipQueueEnd: "is waiting for you there.",
      skipQueueAt: "At pickup time, <b>no need to queue</b>: go straight to the till with order number",
      yourNumber: "Your number",
      commandReady: "Order ready",
      pickupNow: "Come pick it up at A Beyrouth",
      seeyouSoon: "See you soon at A Beyrouth",
      // Step 6 additions (confirmation page)
      willConfirmSoon: "Your order will be confirmed in a moment",
      orderAcceptedExcl: "Order accepted",
      beingPrepared: "Your order is being prepared",
      comePickUp: "Come and collect it",
      enjoyMeal: "Enjoy your meal",
      orderPickedUp: "Order collected",
      thanksForOrder: "Thank you for your order",
      thankYouSoon: "Thank you and see you soon",
      orderCancelled: "Order cancelled",
      refundInProgress: "Refund in progress",
      refundDelay: "The refund will be processed within 5 to 7 business days.",
      cancellationEmailSent: "Cancellation email sent",
      autoRefresh: "This page updates automatically",
      asapLower: "as soon as possible",
      willBeReady: "Your order will be ready"
    },

    // Admin
    admin: {
      login: "Enter admin code to access",
      completedOrders: "Completed orders",
      noCompleted: "No completed orders",
      toggleDishes: "Enable/disable dishes individually. Changes are visible instantly to customers.",
      year: "Year",
      delaySlots: "⏸️ Delay slots:",
      untilTomorrow: "Until tomorrow",
      reminded: "Reminded",
      asap: "ASAP",
      pickedUp: "Picked up",
      completed: "✓ Completed",
      irreversible: "This action is irreversible.",
      spent: "spent",
      last: "last",
      totalSpent: "Total spent",
      favDishes: "Favorite dishes"
    },

    // Emails
    email: {
      orderConfirmed: "Order confirmed",
      number: "Number",
      seeyouSoon: "See you soon",
      paymentConfirmed: "Payment confirmed",
      paymentReceived: "Payment received",
      secondEmail: "You will receive a second email with the summary once the restaurant has validated your order.",
      orderNumber: "Order number",
      scheduledTime: "Scheduled time",
      quoteReceived: "Request received",
      answerIn48h: "Answer within 48h",
      requestRegistered: "Request registered",
      studyRequest: "Our team will review your request and send you a personalized quote within 48 hours.",
      summary: "Summary",
      eventType: "Event type",
      desiredDate: "Desired date",
      orderDetail: "Order details",
      pickupLocation: "Pickup location",
      atBeyrouth: "A Beyrouth",
      viewMaps: "View on Google Maps",
      totalHT: "Total excl. VAT",
      vat10: "VAT 10%",
      totalTTC: "Total incl. VAT",
      yourOrderReady: "Your order is waiting for you",
      reminderReady: "Reminder: your order is ready for pickup.",
      orderAccepted: "Order accepted",
      preparing: "Being prepared",
      pickupCode: "Your pickup code",
      showCounter: "Show at the counter",
      readyFor: "Will be ready for",
      viewRoute: "View route",
      preparingCare: "We're preparing your order with care",
      questions: "Questions? contact@beyrouth.express",
      beyrouthDesc: "A Beyrouth · Authentic Lebanese cuisine"
    },

    // Catering
    catering: {
      promoTitle: "Catering & events",
      promoSubtitle: "Buffets and platters for professional and private events, free quote within 48 hours",
      promoCta: "Request a quote",
      promoCtaArrow: "Request a quote →",
      promoCtaShort: "Discover",
      promoCompactCta: "Quote",
      closeAnnouncement: "Close",
      freeQuote: "Free quote within 48 hours",
      buffetsSubtitle: "Bespoke buffets, prepared with care.",
      title: "Lebanese Cuisine<br>for Your Events",
      customBuffets: "Custom buffets for professional and private events",
      delivery: "Delivery and setup available (La Défense & surroundings)",
      vegOptions: "Vegetarian and vegan options",
      pricing: "From €18/person · Minimum 10 people",
      formIntro: "Fill out this form and we'll get back to you within 48h with a personalized quote",
      professional: "Professional event",
      private: "Private celebration",
      seminar: "Seminar / Training",
      cocktail: "Cocktail / Reception",
      answerIn48h: "We'll get back to you within 48h with a personalized quote",
      // Step 6 additions (quote form submission)
      quoteSent: "Request sent. You will receive a confirmation email. Reply within 48 hours.",
      quoteSentBtn: "Request sent \u2713",
      quoteSending: "Sending…",
      quoteError: "Sending failed. Please try again or contact us at traiteur@beyrouth.express"
    },

    // Form Labels
    form: {
      other: "Other",
      choose: "Choose",
      name: "Your name",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone",
      company: "Company name",
      eventType: "Event type",
      guests: "Number of guests",
      date: "Event date",
      message: "Your message",
      submit: "Send my request",
      generateInvoice: "Generate invoice",
      enterOrderNumber: "Enter your order number"
    },

    // Order form validation (step 6, block 2)
    validation: {
      required: "This field is required",
      emailFormat: "Enter a valid email address",
      phoneFormat: "Enter a valid phone number",
      minGuests: "Plan for at least 10 guests",
      firstNameRequired: "Enter your first name",
      firstNameInvalid: "Invalid first name (letters only, 2-50 characters)",
      phoneRequired: "Enter your phone number",
      phoneInvalid: "Invalid number (e.g. 0612345678 or +33612345678)",
      emailRequired: "Email REQUIRED to receive your confirmation",
      emailInvalid: "Invalid email (e.g. name@gmail.com)",
      pickupRequired: "Choose a pickup time",
      closedChooseOther: "The restaurant is closed. Please choose another time slot."
    },

    // Payment errors shown to the customer (step 6, block 3)
    errors: {
      beforePayment: "Your order could not be saved. You have not been charged. Please try again, or call us on +33 1 47 74 88 12.",
      duringPayment: "The payment did not go through. If your account was charged, call us on +33 1 47 74 88 12 and we will sort it out right away.",
      network: "Connection lost. Please check your network and try again.",
      paymentStart: "The payment could not be started. You have not been charged. Please try again, or pay by credit card."
    },

    // Payment flow (step 6, block 3)
    up: {
      f1: "<strong>Meal deal 1 for {prix}</strong> · sandwich + 2 pastries + drink",
      f1Btn: "Switch to meal deal",
      sweet: "Finish on a sweet note! <strong>{nom}</strong> · {prix}",
      drink: "A <strong>cold drink</strong> with your dish? From <strong>2,00 €</strong>",
      drinkBtn: "See drinks",
      ayran: "Pair it with an <strong>Ayran</strong> · refreshing salted yoghurt {prix}",
    },
    pm: {
      expressUnavailable: "Express checkout unavailable, please use the card below",
      txMissing: "Error: transaction not found. Contact us if you have paid.",
      checkCard: "Check your card details",
      invalidNumber: "Invalid card number",
      sessionExpired: "Session expired, please reload the page",
      invalidCard: "Invalid card: ",
      initError: "Payment could not start",
      edenredConnecting: "Connecting to Edenred…",
      linkExpiredTitle: "Payment link expired",
      linkExpiredHtml: "This payment link has already been used or has expired.<br><br>If your payment was accepted, you will receive a confirmation email.<br>Otherwise, please place a new order.",
      backHome: "Back to home",
      backToCart: "Back to cart",
      redirect: "You will be redirected to the secure login platform",
      title: "Secure payment",
      order: "Order",
      express: "Express checkout",
      or: "or pay by card or meal voucher",
      card: "Credit card",
      restoToggle: "Or pay with a meal voucher card",
      weekendHtml: "<strong>Meal voucher cards are only accepted Monday to Friday.</strong><br>Please use a credit card.",
      payNow: "Pay now",
      secure: "100% secure payment, end-to-end encrypted data",
      applePay: "Pay with Apple Pay",
    },
    payment: {
      secureLoading: "Secure loading…",
      sdkFailed: "The payment system failed to load. Please reload the page.",
      declined: "Payment declined by your bank",
      tooLong: "The payment is taking too long. If you confirmed it, check your order in a few minutes.",
      checking: "Checking payment…",
      checkTimeout: "Verification timed out. Please check your emails.",
      confirmed: "Payment confirmed",
      cancelled: "Payment cancelled or declined",
      inProgress: "Verification in progress... You will receive a confirmation email.",
      checkFailed: "Verification error. Contact us if you have paid.",
      mealCardWeekdaysHtml: "<strong>Luncheon vouchers are accepted Monday to Saturday, 11:30 to 22:00.</strong><br>Please use a credit card.",
      mealCardHoursHtml: "<strong>Luncheon vouchers are only accepted between 11:30 and 22:00.</strong><br>Please use a credit card.",
      mealCardWeekdays: "Luncheon vouchers are only accepted Monday to Saturday, 11:30 to 21:00",
      mealCardHours: "Luncheon vouchers are only accepted between 11:30 and 21:00",
      mealCardCapHtml: "<strong>Luncheon vouchers are capped at {cap} per day.</strong><br>Your basket is {total}; the payment will be declined. Pay by credit card or remove an item to bring the total below {cap}.",
      mealCardCapToast: "Luncheon voucher limit: {cap} per day. Your basket is {total}; the payment will be declined.",
      timeoutTitle: "Timed out",
      timeoutMsg: "The payment server is not responding.<br><br>Please check your connection and try again, or use a credit card.",
      notAllowedTitle: "Payment not allowed",
      notAllowedMsg: "Luncheon vouchers can only be used <strong>Monday to Friday</strong>.<br><br>Please try again on a weekday or use a credit card.",
      limitTitle: "Limit exceeded",
      limitMsg: "The amount exceeds your luncheon voucher limit.<br><br>Please use a credit card.",
      unavailableTitle: "Service temporarily unavailable",
      unavailableMsg: "The Edenred payment service is temporarily unavailable.<br><br>Please try again shortly or use a credit card.",
      errorTitle: "Payment error"
    },

    // Messages & Notifications
    messages: {
      orderNotFound: "Order not found. Check the number.",
      orderLoadError: "The order could not be loaded",
      invoiceGenerated: "Invoice generated",
      generatingInvoice: "Generating invoice",
      emailConfirmSent: "Confirmation email sent",
      enjoyMeal: "Enjoy your meal",
      thankYou: "Thank you and see you soon",
      detail: "Details"
    },

    // Footer
    banner: {
      message: "The oven is resting, and so is the team. Have a great summer.",
      reopening: "Reopening Monday 31 August",
      closed: "Closed for holidays",
    },
    footer: {
      leaveReview: "Leave a review",
      hours: "Click & collect 7 days a week · Pickup Mon to Fri 11.30am to 8.30pm",
      onlineService: "Online service by A Beyrouth",
      address: "4 Esplanade du Général de Gaulle, 92400 Courbevoie",
      metro: "Metro Exit 4",
      visit: "Find us",
      openingHours: "Opening hours",
      pickup: "Pickup",
      weekHours: "Mon-Fri · 11.30am-8.30pm",
      everyDay: "7 days a week",
      cateringTitle: "Catering & events",
      cateringDescription: "Buffets and platters for your events",
      cateringCta: "Request a quote →",
      menu: "Menu",
      sandwiches: "Sandwiches",
      formulas: "Meal deals",
      plates: "Plates",
      mezze: "Mezze"
    }
  },
  ar: {
    meta: {
      title: "مطعم لبناني في La Défense - A Beyrouth | Click & Collect",
      description: "مطعم A Beyrouth اللبناني في La Défense Courbevoie. اطلب أونلاين: شاورما، مازة، مشاوي، فلافل. استلام سريع خلال 15 دقيقة. نقبل قسائم الوجبات (Swile، Ticket Restaurant، Conecs).",
      ogTitle: "A Beyrouth · مطعم لبناني في La Défense",
      ogDescription: "مطبخ لبناني أصيل في La Défense. اطلب أونلاين واستلم خلال 15 دقيقة. نقبل قسائم الوجبات.",
      cuisine: "لبناني",
      paymentMethods: "بطاقة بنكية، Swile، Ticket Restaurant، Restoflash، Conecs",
    },
    aria: {
      close: "إغلاق",
      closeCart: "إغلاق السلة",
      firstName: "الاسم",
      phone: "الهاتف",
      note: "ملاحظة للمطعم",
      googleReview: "اترك تقييمًا على Google",
    },
    nav: {
      orderNow: "اطلب الآن",
      menu: "القائمة",
      catering: "خدمة الضيافة",
      contact: "اتصل بنا",
    },
    timepicker: {
      chooseSlot: "اختر موعدًا",
      prep15min: "تحضير خلال ~10 دقائق",
      orChooseSlot: "أو اختر موعدًا",
      pickupTime: "وقت الاستلام",
      noQueue: "بدون انتظار: مباشرة إلى الكاونتر",
      asap: "في أقرب وقت ممكن",
      asapDelay: "في أقرب وقت ممكن (~10 دقائق)",
      nextSlot: "أقرب موعد متاح",
      closesAt: "يُغلق الساعة",
      open: "مفتوح",
      closed: "مغلق",
      tempClosure: "مغلق مؤقتًا",
      nextPickup: "الاستلام القادم",
      until: "حتى",
      hourSep: ":",
      today: "اليوم",
      tomorrow: "غدًا",
    },
    days: {
      sunday: "الأحد",
      monday: "الاثنين",
      tuesday: "الثلاثاء",
      wednesday: "الأربعاء",
      thursday: "الخميس",
      friday: "الجمعة",
      saturday: "السبت",
    },
    cart: {
      each: "للقطعة",
      notePh: "ملاحظة: حساسية، بدون بصل، إلخ.",
      viewCart: "عرض السلة",
      namePh: "الاسم",
      phonePh: "الهاتف (مثال: 0612345678)",
      placeOrder: "أرسل الطلب",
      modify: "تعديل",
      addToCart: "أضف إلى السلة",
      pickupTime: "وقت الاستلام",
      yourOrder: "طلبك",
      empty: "سلتك فارغة",
      add: "أضف",
      remove: "احذف",
      total: "المجموع",
      subtotal: "المجموع الفرعي",
      optin: "أبلغوني بالعروض والتخفيضات",
      securePayment: "دفع آمن عبر الإنترنت (بطاقة بنكية، قسيمة وجبات)",
      payNow: "ادفع الآن",
      openingPayment: "جارٍ فتح صفحة الدفع…",
      orderNow: "اطلب الآن",
      tempClosed: "خدمة Click & Collect مغلقة مؤقتًا.\nنعود قريبًا.",
      formulaAdded: "تمت إضافة الوجبة إلى السلة",
      drinkWithThat: "مشروب معها؟",
      removedUnavailable: (noms, pluriel) =>
        `${noms} ${pluriel ? 'لم تعد متوفرة' : 'لم يعد متوفرًا'} و${pluriel ? 'تمت إزالتها' : 'تمت إزالته'} من سلتك`,
    },
    menu: {
      loading: "جارٍ تحميل القائمة…",
      customize: "خصّص وجبتك",
      soonAvailable: "متوفر قريبًا",
      formula1: "وجبة 1",
      formula1Desc: "ساندويش + 2 معجنات + مشروب",
      addDrink: "مشروب منعش مع وجبتك؟",
      from: "ابتداءً من",
    },
    status: {
      paid: "مدفوع",
      paidDesc: "تم استلام الطلب ودفعه",
      accepted: "مقبول",
      acceptedDesc: "قبل المطعم طلبك",
      preparing: "قيد التحضير",
      preparingDesc: "طلبك قيد التحضير",
      ready: "جاهز",
      readyDesc: "تعال لاستلام طلبك",
      pickedUp: "تم الاستلام",
      pickedUpDesc: "صحتين وعافية",
      cancelled: "ملغى",
    },
    confirmation: {
      backToMenu: "العودة إلى القائمة",
      loading: "جارٍ تحميل طلبك…",
      title: "تم تأكيد الطلب | Beyrouth Express",
      paymentValidated: "تم قبول الدفع",
      orderRegistered: "تم تسجيل طلبك",
      pickupTime: "موعد الاستلام",
      whereToPickup: "مكان الاستلام",
      address: "4 Esplanade du Général de Gaulle<br>92400 Courbevoie (La Défense)",
      metro: "المترو، المخرج 4 La Défense",
      openMaps: "افتح في Google Maps",
      seeCart: "عرض السلة",
      metroShort: "La Défense · مخرج المترو 4",
      youMayLike: "قد يعجبك أيضًا",
      examining: "المطعم يراجع طلبك.<br>ستصلك رسالة إلكترونية عند التأكيد.",
      emailSent: "تم إرسال البريد الإلكتروني",
      willNotify: "سنبلغك عند التأكيد",
      preparing: "التحضير جارٍ",
      readyAt: "سيكون طلبك جاهزًا الساعة",
      orderAccepted: "تم قبول الطلب",
      orderReady: "طلبك جاهز",
      canPickup: "يمكنك استلامه من المطعم",
      skipQueue: "<b>لا داعي للانتظار في الطابور</b>: توجّه مباشرة إلى الصندوق، طلبك",
      skipQueueEnd: "بانتظارك هناك.",
      skipQueueAt: "عند موعد الاستلام، <b>لا داعي للانتظار في الطابور</b>: توجّه مباشرة إلى الصندوق برقم الطلب",
      yourNumber: "رقمك",
      commandReady: "الطلب جاهز",
      pickupNow: "تعال لاستلامه في A Beyrouth",
      seeyouSoon: "نراك قريبًا في A Beyrouth",
      willConfirmSoon: "سيتم تأكيد طلبك بعد لحظات",
      orderAcceptedExcl: "تم قبول الطلب",
      beingPrepared: "طلبك قيد التحضير",
      comePickUp: "تعال لاستلامه",
      enjoyMeal: "صحتين وعافية",
      orderPickedUp: "تم استلام الطلب",
      thanksForOrder: "شكرًا على طلبك",
      thankYouSoon: "شكرًا ونراك قريبًا",
      orderCancelled: "تم إلغاء الطلب",
      refundInProgress: "الاسترداد جارٍ",
      refundDelay: "سيتم رد المبلغ خلال 5 إلى 7 أيام عمل.",
      cancellationEmailSent: "تم إرسال بريد الإلغاء",
      autoRefresh: "تتحدّث هذه الصفحة تلقائيًا",
      asapLower: "في أقرب وقت ممكن",
      willBeReady: "سيكون طلبك جاهزًا",
    },
    admin: {
      login: "أدخل رمز المسؤول للدخول",
      completedOrders: "الطلبات المنجزة",
      noCompleted: "لا توجد طلبات منجزة",
      toggleDishes: "فعّل أو عطّل الأطباق واحدًا واحدًا. تظهر التغييرات للزبائن فورًا.",
      year: "السنة",
      delaySlots: "⏸️ تأجيل المواعيد:",
      untilTomorrow: "حتى الغد",
      reminded: "تم التذكير",
      asap: "في أقرب وقت",
      pickedUp: "تم الاستلام",
      completed: "✓ منجز",
      irreversible: "لا يمكن التراجع عن هذا الإجراء.",
      spent: "أُنفق",
      last: "الأخير",
      totalSpent: "إجمالي الإنفاق",
      favDishes: "الأطباق المفضلة",
    },
    email: {
      orderConfirmed: "تم تأكيد الطلب",
      number: "الرقم",
      seeyouSoon: "نراك قريبًا",
      paymentConfirmed: "تم تأكيد الدفع",
      paymentReceived: "تم استلام الدفع",
      secondEmail: "ستصلك رسالة ثانية فيها ملخص الطلب بعد أن يقبل المطعم طلبك.",
      orderNumber: "رقم الطلب",
      scheduledTime: "الموعد المحدد",
      quoteReceived: "تم استلام الطلب",
      answerIn48h: "الرد خلال 48 ساعة",
      requestRegistered: "تم تسجيل الطلب",
      studyRequest: "سيدرس فريقنا طلبك ويرسل لك عرض سعر مخصصًا خلال 48 ساعة.",
      summary: "الملخص",
      eventType: "نوع المناسبة",
      desiredDate: "التاريخ المطلوب",
      orderDetail: "تفاصيل الطلب",
      pickupLocation: "مكان الاستلام",
      atBeyrouth: "A Beyrouth",
      viewMaps: "عرض على Google Maps",
      totalHT: "المجموع بدون ضريبة",
      vat10: "ضريبة القيمة المضافة 10%",
      totalTTC: "المجموع شامل الضريبة",
      yourOrderReady: "طلبك بانتظارك",
      reminderReady: "تذكير: طلبك جاهز للاستلام.",
      orderAccepted: "تم قبول الطلب",
      preparing: "قيد التحضير",
      pickupCode: "رمز الاستلام",
      showCounter: "أظهره عند الكاونتر",
      readyFor: "سيكون جاهزًا الساعة",
      viewRoute: "عرض الطريق",
      preparingCare: "نحضّر طلبك بكل عناية",
      questions: "أسئلة؟ contact@beyrouth.express",
      beyrouthDesc: "A Beyrouth · مطبخ لبناني أصيل",
    },
    catering: {
      promoTitle: "خدمة الضيافة والمناسبات",
      promoSubtitle: "بوفيهات وصوانٍ للمناسبات المهنية والخاصة، عرض سعر مجاني خلال 48 ساعة",
      promoCta: "اطلب عرض سعر",
      promoCtaArrow: "اطلب عرض سعر →",
      promoCtaShort: "اكتشف",
      promoCompactCta: "عرض سعر",
      closeAnnouncement: "إغلاق",
      freeQuote: "عرض سعر مجاني خلال 48 ساعة",
      buffetsSubtitle: "بوفيهات حسب الطلب، محضّرة بعناية.",
      title: "المطبخ اللبناني<br>لمناسباتكم",
      customBuffets: "بوفيهات حسب الطلب للمناسبات المهنية والخاصة",
      delivery: "توصيل وتجهيز متوفران (La Défense والمناطق المجاورة)",
      vegOptions: "خيارات نباتية ونباتية صرفة",
      pricing: "ابتداءً من €18 للشخص · 10 أشخاص كحد أدنى",
      formIntro: "املأ هذا النموذج وسنعود إليك خلال 48 ساعة بعرض سعر مخصص",
      professional: "مناسبة مهنية",
      private: "احتفال خاص",
      seminar: "ندوة / تدريب",
      cocktail: "كوكتيل / حفل استقبال",
      answerIn48h: "سنعود إليك خلال 48 ساعة بعرض سعر مخصص",
      quoteSent: "تم إرسال الطلب. ستصلك رسالة تأكيد. الرد خلال 48 ساعة.",
      quoteSentBtn: "تم الإرسال ✓",
      quoteSending: "جارٍ الإرسال…",
      quoteError: "تعذّر الإرسال. حاول مجددًا أو راسلنا على traiteur@beyrouth.express",
    },
    form: {
      other: "أخرى",
      choose: "اختر",
      name: "اسمك",
      firstName: "الاسم",
      lastName: "اسم العائلة",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      company: "اسم الشركة",
      eventType: "نوع المناسبة",
      guests: "عدد الضيوف",
      date: "تاريخ المناسبة",
      message: "رسالتك",
      submit: "أرسل طلبي",
      generateInvoice: "أنشئ الفاتورة",
      enterOrderNumber: "أدخل رقم طلبك",
    },
    validation: {
      required: "هذا الحقل مطلوب",
      emailFormat: "أدخل بريدًا إلكترونيًا صحيحًا",
      phoneFormat: "أدخل رقم هاتف صحيحًا",
      minGuests: "10 ضيوف على الأقل",
      firstNameRequired: "أدخل اسمك",
      firstNameInvalid: "اسم غير صالح (أحرف فقط، من 2 إلى 50 حرفًا)",
      phoneRequired: "أدخل رقم هاتفك",
      phoneInvalid: "رقم غير صالح (مثال: 0612345678 أو +33612345678)",
      emailRequired: "البريد الإلكتروني ضروري لاستلام التأكيد",
      emailInvalid: "بريد إلكتروني غير صالح (مثال: name@gmail.com)",
      pickupRequired: "اختر وقت الاستلام",
      closedChooseOther: "المطعم مغلق. اختر موعدًا آخر من فضلك.",
    },
    errors: {
      beforePayment: "تعذّر حفظ طلبك. لم يُخصم أي مبلغ. حاول مجددًا أو اتصل بنا على +33 1 47 74 88 12.",
      duringPayment: "لم تتم عملية الدفع. إذا خُصم المبلغ من حسابك، اتصل بنا على +33 1 47 74 88 12 وسنحل الأمر فورًا.",
      network: "انقطع الاتصال. تحقّق من الشبكة وحاول مجددًا.",
      paymentStart: "تعذّر بدء الدفع. لم يُخصم أي مبلغ. حاول مجددًا أو ادفع بالبطاقة البنكية.",
    },
    pm: {
      expressUnavailable: "الدفع السريع غير متاح، استخدم البطاقة أدناه",
      txMissing: "خطأ: لم يتم العثور على العملية. اتصل بنا إذا كنت قد دفعت.",
      checkCard: "تحقّق من بيانات بطاقتك",
      invalidNumber: "رقم البطاقة غير صالح",
      sessionExpired: "انتهت الجلسة، أعد تحميل الصفحة",
      invalidCard: "بطاقة غير صالحة: ",
      initError: "تعذّر بدء الدفع",
      edenredConnecting: "جارٍ الاتصال بـ Edenred…",
      linkExpiredTitle: "انتهت صلاحية رابط الدفع",
      linkExpiredHtml: "رابط الدفع هذا استُخدم من قبل أو انتهت صلاحيته.<br><br>إذا قُبل الدفع، ستصلك رسالة تأكيد.<br>وإلا، يُرجى إرسال طلب جديد.",
      backHome: "العودة إلى الرئيسية",
      backToCart: "العودة إلى السلة",
      redirect: "سيتم تحويلك إلى منصة الدخول الآمنة",
      title: "دفع آمن",
      order: "الطلب",
      express: "دفع سريع",
      or: "أو ادفع بالبطاقة أو بقسيمة الوجبات",
      card: "بطاقة بنكية",
      restoToggle: "أو ادفع ببطاقة قسائم الوجبات",
      weekendHtml: "<strong>بطاقات قسائم الوجبات مقبولة من الاثنين إلى الجمعة فقط.</strong><br>يُرجى استخدام بطاقة بنكية.",
      payNow: "ادفع الآن",
      secure: "دفع آمن 100%، بيانات مشفّرة بالكامل",
      applePay: "ادفع بـ Apple Pay",
    },
    payment: {
      secureLoading: "تحميل آمن…",
      sdkFailed: "تعذّر تحميل نظام الدفع. أعد تحميل الصفحة من فضلك.",
      declined: "رفض البنك عملية الدفع",
      tooLong: "الدفع يستغرق وقتًا طويلًا. إذا أكّدته، تحقّق من طلبك بعد بضع دقائق.",
      checking: "جارٍ التحقق من الدفع…",
      checkTimeout: "انتهت مهلة التحقق. تفقّد بريدك الإلكتروني.",
      confirmed: "تم تأكيد الدفع",
      cancelled: "تم إلغاء الدفع أو رفضه",
      inProgress: "جارٍ التحقق... ستصلك رسالة تأكيد.",
      checkFailed: "خطأ في التحقق. اتصل بنا إذا كنت قد دفعت.",
      mealCardWeekdaysHtml: "<strong>قسائم الوجبات مقبولة من الاثنين إلى السبت، من 11:30 إلى 22:00.</strong><br>يُرجى استخدام بطاقة بنكية.",
      mealCardHoursHtml: "<strong>قسائم الوجبات مقبولة فقط بين 11:30 و22:00.</strong><br>يُرجى استخدام بطاقة بنكية.",
      mealCardWeekdays: "قسائم الوجبات مقبولة فقط من الاثنين إلى السبت، من 11:30 إلى 21:00",
      mealCardHours: "قسائم الوجبات مقبولة فقط بين 11:30 و21:00",
      mealCardCapHtml: "<strong>الحد الأقصى لقسائم الوجبات {cap} في اليوم.</strong><br>مجموع سلتك {total}، وسيُرفض الدفع. ادفع بالبطاقة البنكية أو احذف صنفًا ليصبح المجموع أقل من {cap}.",
      mealCardCapToast: "حد قسائم الوجبات: {cap} في اليوم. مجموع سلتك {total}، وسيُرفض الدفع.",
      timeoutTitle: "انتهت المهلة",
      timeoutMsg: "خادم الدفع لا يستجيب.<br><br>تحقّق من اتصالك وحاول مجددًا، أو استخدم بطاقة بنكية.",
      notAllowedTitle: "الدفع غير مسموح",
      notAllowedMsg: "يمكن استخدام قسائم الوجبات <strong>من الاثنين إلى الجمعة</strong> فقط.<br><br>حاول مجددًا في يوم عمل أو استخدم بطاقة بنكية.",
      limitTitle: "تم تجاوز الحد",
      limitMsg: "المبلغ يتجاوز حد قسائم الوجبات لديك.<br><br>يُرجى استخدام بطاقة بنكية.",
      unavailableTitle: "الخدمة غير متاحة مؤقتًا",
      unavailableMsg: "خدمة الدفع Edenred غير متاحة مؤقتًا.<br><br>حاول مجددًا بعد قليل أو استخدم بطاقة بنكية.",
      errorTitle: "خطأ في الدفع",
    },
    messages: {
      orderNotFound: "الطلب غير موجود. تحقّق من الرقم.",
      orderLoadError: "تعذّر تحميل الطلب",
      invoiceGenerated: "تم إنشاء الفاتورة",
      generatingInvoice: "جارٍ إنشاء الفاتورة",
      emailConfirmSent: "تم إرسال رسالة التأكيد",
      enjoyMeal: "صحتين وعافية",
      thankYou: "شكرًا ونراك قريبًا",
      detail: "التفاصيل",
    },
    banner: {
      message: "الفرن يرتاح، والفريق أيضًا. صيفًا سعيدًا.",
      reopening: "نعود يوم الاثنين 31 أغسطس",
      closed: "مغلق للعطلة",
    },
    footer: {
      leaveReview: "اترك تقييمًا",
      hours: "Click & Collect طوال أيام الأسبوع · الاستلام من الاثنين إلى الجمعة من 11:30 إلى 20:30",
      onlineService: "خدمة أونلاين من A Beyrouth",
      address: "4 Esplanade du Général de Gaulle, 92400 Courbevoie",
      metro: "المترو، المخرج 4",
      visit: "تجدوننا هنا",
      openingHours: "ساعات العمل",
      pickup: "الاستلام",
      weekHours: "الاثنين-الجمعة · 11:30-20:30",
      everyDay: "طوال أيام الأسبوع",
      cateringTitle: "خدمة الضيافة والمناسبات",
      cateringDescription: "بوفيهات وصوانٍ لمناسباتكم",
      cateringCta: "اطلب عرض سعر →",
      menu: "القائمة",
      sandwiches: "ساندويشات",
      formulas: "الوجبات",
      plates: "الأطباق",
      mezze: "مازة",
    },
    up: {
      f1: "<strong>الوجبة 1 بسعر {prix}</strong> · ساندويش + 2 معجنات + مشروب",
      f1Btn: "حوّلها إلى وجبة",
      sweet: "اختم بلمسة حلوة! <strong>{nom}</strong> · {prix}",
      drink: "<strong>مشروب بارد</strong> مع طبقك؟ ابتداءً من <strong>2,00 €</strong>",
      drinkBtn: "عرض المشروبات",
      ayran: "أضف <strong>عيران</strong> · لبن مالح منعش {prix}",
    },
  }
};

// État actuel de la langue
let currentLang = 'fr';
// ARABE (04/11/2026) : interrupteur. false = personne ne voit l'arabe, sauf l'aperçu caché ?apercu-ar=1 (?apercu-ar=0 pour sortir).
var ARABE_ACTIF = false;
var ARABE_OK = (function () {
  try {
    var q = location.search || '';
    if (/[?&]apercu-ar=0/.test(q)) { localStorage.removeItem('beyrouth_apercu_ar'); if (localStorage.getItem('beyrouth_lang') === 'ar') localStorage.removeItem('beyrouth_lang'); }
    if (/[?&]apercu-ar=1/.test(q)) { localStorage.setItem('beyrouth_apercu_ar', '1'); localStorage.setItem('beyrouth_lang', 'ar'); }
    return ARABE_ACTIF || localStorage.getItem('beyrouth_apercu_ar') === '1';
  } catch (e) { return ARABE_ACTIF; }
})();

/**
 * Détecte la langue du navigateur
 */
function detectBrowserLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  // Si c'est anglais (en, en-US, en-GB...), retourner 'en', sinon 'fr'
  return browserLang.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

/**
 * Initialise la langue au chargement
 */
function initLanguage() {
  // On lit UNIQUEMENT le choix explicite du visiteur (les deux drapeaux).
  //
  // 11/08/2026 : la detection automatique du navigateur est VOLONTAIREMENT
  // ecartee ici. Elle reste disponible via detectBrowserLanguage() mais n est
  // plus utilisee au demarrage, pour deux raisons :
  //   · REFERENCEMENT. Le robot de Google explore en se presentant en anglais.
  //     Avec une detection, il verrait le site traduit et pourrait indexer
  //     l anglais a la place du francais. Le site n a qu UNE SEULE adresse,
  //     donc pas de version /en/ a lui proposer en echange : la version
  //     francaise serait simplement remplacee dans l index.
  //   · Un francais en voyage, ou avec un telephone configure en anglais,
  //     tomberait sur un site anglais sans comprendre pourquoi.
  //
  // Sans choix memorise, on reste donc en francais. Le visiteur clique, et
  // son choix le suit de page en page.
  try {
    const savedLang = localStorage.getItem('beyrouth_lang');
    if (savedLang === 'fr' || savedLang === 'en' || (savedLang === 'ar' && ARABE_OK)) currentLang = savedLang;
  } catch (e) { /* navigation privee : on reste en francais */ }
  return currentLang;
}

/**
 * Change la langue et recharge les traductions
 */
function setLanguage(lang) {
  if (lang !== 'fr' && lang !== 'en' && !(lang === 'ar' && ARABE_OK)) return;

  currentLang = lang;
  localStorage.setItem('beyrouth_lang', lang);

  // Trigger event pour que les pages écoutent
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));

  // Appliquer les traductions
  applyTranslations();
}

/**
 * Retourne la langue actuelle
 */
function getCurrentLanguage() {
  return currentLang;
}

/**
 * Retourne une traduction par clé (ex: "cart.total")
 */
function t(key) {
  // FILET DE SECURITE (11/08/2026) : une cle manquante affichait la CLE TECHNIQUE
  // a l ecran (un visiteur anglais aurait lu "cart.total" a la place de son total).
  // Desormais on retombe sur le FRANCAIS, qui est toujours complet : au pire un
  // fragment reste en francais, jamais de texte casse. C est la condition pour
  // pouvoir activer le bilingue sans risque.
  function lire(dict) {
    let v = dict;
    for (const k of key.split('.')) {
      if (v && typeof v === 'object') v = v[k];
      else return undefined;
    }
    // 11/08/2026 : les fonctions sont acceptees. Certains messages dependent du
    // pluriel ou d un montant (ex. « X n est plus disponible » / « X ne sont plus
    // disponibles ») : sans cela t() les rejetait et affichait la CLE a l ecran.
    return (typeof v === 'string' || typeof v === 'number' || typeof v === 'function') ? v : undefined;
  }
  const val = lire(translations[currentLang]);
  if (val !== undefined) return val;
  const fr = lire(translations.fr);          // repli systematique sur le francais
  if (fr !== undefined) {
    if (currentLang !== 'fr' && typeof console !== 'undefined' && console.debug) {
      console.debug('[i18n] traduction manquante (' + currentLang + ') : ' + key);
    }
    return fr;
  }
  return key;                                 // ni traduit ni en francais : cas impossible en pratique
}

/**
 * Applique les traductions aux éléments data-i18n
 */
function applyTranslations() {
  // Libellés lus par les lecteurs d'écran (04/11)
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  // Traduire les éléments avec data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);

    if (el.hasAttribute('data-i18n-placeholder')) {
      el.placeholder = translation;
    } else if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = translation;
    } else {
      el.textContent = translation;
    }
  });

  // Mettre à jour le HTML lang
  document.documentElement.lang = currentLang;
  if (currentLang === 'ar') document.documentElement.dir = 'rtl'; else if (document.documentElement.getAttribute('dir') === 'rtl') document.documentElement.removeAttribute('dir'); // arabe : lecture de droite à gauche

  // Mettre à jour les meta tags
  // 11/08/2026 : NE PLUS ecraser le titre ni la meta description par defaut.
  // Ces 3 lignes s appliquaient a TOUTE page chargeant ce fichier, sans balise :
  //   · l accueil « Restaurant Libanais La Defense - A Beyrouth | Click & Collect »
  //     devenait « A Beyrouth · Restaurant Libanais La Defense | ... » ;
  //   · la page TRAITEUR perdait son propre titre « Traiteur Libanais La Defense »
  //     au profit de celui de l accueil : perte seche de referencement sur la
  //     requete « traiteur libanais la defense ».
  // Desormais il faut que la page le demande, en declarant sa PROPRE cle :
  //   <html lang="fr" data-i18n-title="meta.title" data-i18n-desc="meta.description">
  // Aucune page ne le fait aujourd hui -> title et meta restent intacts.
  const racine = document.documentElement;
  const cleTitre = racine && racine.getAttribute && racine.getAttribute('data-i18n-title');
  if (cleTitre) document.title = t(cleTitre);
  const cleDesc = racine && racine.getAttribute && racine.getAttribute('data-i18n-desc');
  if (cleDesc) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t(cleDesc);
  }
}

// Export pour utilisation dans les autres scripts
window.i18n = {
  init: initLanguage,
  set: setLanguage,
  get: getCurrentLanguage,
  t: t,
  apply: applyTranslations,
  translations: translations
};

// ===== AUTO-INIT (11/08/2026) =====
// Sans ceci, le choix du visiteur etait enregistre mais JAMAIS relu : passer
// en anglais puis aller sur la page traiteur repartait en francais. Le
// dictionnaire est charge dans le <head>, donc on applique des que le corps
// de la page existe.
(function () {
  // 11/08/2026 : SELECTEUR RETIRE DE LA PRODUCTION le temps de finir le
  // chantier (menu, devis traiteur). Tant que ce drapeau est a false, le site
  // est en francais pour TOUT LE MONDE, y compris ceux qui avaient deja
  // clique sur EN pendant les essais. Tout le travail de traduction reste en
  // place dessous, il suffira de repasser ce drapeau a true.
  var BILINGUE_ACTIF = true; // 04/11/2026 18h35 : ANGLAIS OUVERT A TOUS (go de Ludo). Retour arriere : remettre false.
  // 04/11/2026 : APERCU CACHE pour Ludo. ?apercu-en=1 passe CE navigateur en anglais
  // (memorise, suit le visiteur de page en page et au retour du paiement), ?apercu-en=0 l'enleve.
  // Aucun lien ne mene ici : les clients et Google continuent de voir le site en francais.
  var APERCU = false;
  try {
    var q = location.search || '';
    if (/[?&]apercu-en=0/.test(q)) { localStorage.removeItem('beyrouth_apercu_en'); localStorage.removeItem('beyrouth_lang'); }
    if (/[?&]apercu-en=1/.test(q)) { localStorage.setItem('beyrouth_apercu_en', '1'); localStorage.setItem('beyrouth_lang', 'en'); }
    APERCU = localStorage.getItem('beyrouth_apercu_en') === '1';
  } catch (e) {}
  if (!BILINGUE_ACTIF && !APERCU) return;
  try {
    initLanguage();
    // Détection du navigateur (seulement le jour où BILINGUE_ACTIF passe à true) :
    // un visiteur au téléphone en anglais voit l'anglais, SAUF les robots (Google, Bing…)
    // qui voient toujours le français, pour garder le référencement français.
    // Un choix fait au bouton FR · EN est mémorisé et passe toujours avant.
    try {
      var dejaChoisi = localStorage.getItem('beyrouth_lang');
      var robot = /bot|crawl|spider|slurp|google|bing|yandex|duckduck|baidu|facebookexternalhit|lighthouse|headless|preview/i.test(navigator.userAgent || '');
      if (BILINGUE_ACTIF && !dejaChoisi && !robot && /^en\b/i.test(navigator.language || '')) currentLang = 'en';
      if (ARABE_ACTIF && BILINGUE_ACTIF && !dejaChoisi && !robot && /^ar\b/i.test(navigator.language || '')) currentLang = 'ar';
    } catch (e2) {}
    // Arabe : police arabe chargée seulement pour ces visiteurs
    if (currentLang === 'ar') {
      try {
        document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar';
        var lf = document.createElement('link'); lf.rel = 'stylesheet';
        lf.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Noto+Kufi+Arabic:wght@500;600&display=swap';
        document.head.appendChild(lf);
      } catch (e3) {}
    }
    var montrerBoutons = function () {
      // Bouton عربي ajouté seulement si l'arabe est ouvert (ou en aperçu) : la page FR/EN reste identique sinon
      if (ARABE_OK) document.querySelectorAll('.lang-toggle').forEach(function (g) {
        if (g.querySelector('[data-lang-btn="ar"]')) return;
        var sep = document.createElement('span'); sep.setAttribute('aria-hidden', 'true'); sep.textContent = '·';
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-lang-btn', 'ar'); b.setAttribute('lang', 'ar'); b.textContent = 'عربي';
        b.addEventListener('click', function () { if (typeof choisirLangue === 'function') choisirLangue('ar'); });
        g.appendChild(sep); g.appendChild(b);
      });
      document.querySelectorAll('.lang-toggle').forEach(function (g) { g.hidden = false; });
      document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
        if (b.getAttribute('data-lang-btn') === currentLang) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montrerBoutons); else montrerBoutons();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { applyTranslations(); });
    } else {
      applyTranslations();
    }
  } catch (e) { /* au pire la page reste en francais, jamais cassee */ }
})();
